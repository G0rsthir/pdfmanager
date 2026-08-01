from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote_plus
from uuid import UUID

from server.exceptions import InsufficientPermissionError
from server.infrastructure.opds.document import (
    OpdsAuthor,
    OpdsCategory,
    OpdsEntry,
    OpdsFeed,
    OpdsLink,
    OpdsLinkType,
    OpdsRel,
    OpenSearchDescription,
)
from server.models import ORMCollection, ORMFile, ORMFileState
from server.repositories import (
    CollectionRepository,
    FileRepository,
    PermissionRepository,
    PersonalizedTag,
    TagRepository,
)

# Atom requires an author on every feed.
CATALOG_AUTHOR = OpdsAuthor(name="PDF Manager")


class OpdsUrls:
    def __init__(self, url_for: Callable[..., Any]):
        self._url_for = url_for

    def root(self) -> str:
        return str(self._url_for("get_opds_root"))

    def all_files(self) -> str:
        return str(self._url_for("get_opds_all_files"))

    def collections(self) -> str:
        return str(self._url_for("get_opds_collections"))

    def shelf(self) -> str:
        return str(self._url_for("get_opds_shelf"))

    def collection(self, collection_id: UUID) -> str:
        return str(self._url_for("get_opds_collection", collection_id=str(collection_id)))

    def opensearch(self) -> str:
        return str(self._url_for("get_opds_opensearch"))

    def search_template(self) -> str:
        return f"{self._url_for('get_opds_search')}?q={{searchTerms}}"

    def search(self, query: str) -> str:
        return f"{self._url_for('get_opds_search')}?q={quote_plus(query)}"

    def download(self, file_id: UUID, ext: str = "pdf") -> str:
        return str(self._url_for("download_opds_file", id=str(file_id), ext=ext))

    def thumbnail(self, file_id: UUID) -> str:
        return str(self._url_for("download_opds_thumbnail", id=str(file_id)))


class OpdsCatalogService:
    def __init__(
        self,
        *,
        file_repo: FileRepository,
        collection_repo: CollectionRepository,
        tags_repo: TagRepository,
        permission_repo: PermissionRepository,
        urls: OpdsUrls,
    ):
        self._file_repo = file_repo
        self._collection_repo = collection_repo
        self._tags_repo = tags_repo
        self._permission_repo = permission_repo
        self._urls = urls

    def root_url(self):
        return self._urls.root()

    def root_feed(self) -> OpdsFeed:
        now = datetime.now(UTC)
        root_url = self._urls.root()

        sections = [
            ("shelf", "Reading Now", "Files you have started reading", self._urls.shelf(), OpdsLinkType.ACQUISITION),
            ("all", "All Files", "Every document in the library", self._urls.all_files(), OpdsLinkType.ACQUISITION),
            (
                "collections",
                "Collections",
                "Browse by collection",
                self._urls.collections(),
                OpdsLinkType.NAVIGATION,
            ),
        ]

        entries = [
            OpdsEntry(
                id=f"urn:pdfmanager:section:{key}",
                title=title,
                updated=now,
                content=description,
                links=[OpdsLink(href=href, type=feed_type, rel=OpdsRel.SUBSECTION)],
            )
            for key, title, description, href, feed_type in sections
        ]

        return OpdsFeed(
            id=root_url,
            title="PDF Manager Library",
            author=CATALOG_AUTHOR,
            updated=now,
            links=[
                OpdsLink(href=root_url, type=OpdsLinkType.NAVIGATION, rel=OpdsRel.SELF),
                OpdsLink(href=root_url, type=OpdsLinkType.NAVIGATION, rel=OpdsRel.START),
                # Shelf discovery
                OpdsLink(href=self._urls.shelf(), type=OpdsLinkType.ACQUISITION, rel=OpdsRel.SHELF),
                # Search
                OpdsLink(
                    href=self._urls.opensearch(),
                    type=OpdsLinkType.OPENSEARCH,
                    rel=OpdsRel.SEARCH,
                    title="Search",
                ),
            ],
            entries=entries,
        )

    def opensearch_description(self) -> OpenSearchDescription:
        return OpenSearchDescription(
            short_name="PDF Manager",
            description="Search the library",
            url_template=self._urls.search_template(),
        )

    async def get_search_feed(self, user_id: UUID, query: str) -> OpdsFeed:
        """
        Search results feed
        """
        entries = await self._file_entries(user_id=user_id, name=query) if query.strip() else []

        self_url = self._urls.search(query)
        return OpdsFeed(
            id=self_url,
            title=f"Search: {query}",
            author=CATALOG_AUTHOR,
            updated=max((e.updated for e in entries), default=datetime.now(UTC)),
            links=self._nav_links(
                up_url=self._urls.root(),
                up_type=OpdsLinkType.NAVIGATION,
                self_url=self_url,
                self_type=OpdsLinkType.ACQUISITION,
            ),
            entries=entries,
        )

    async def get_all_files_feed(self, user_id: UUID) -> OpdsFeed:
        """
        All files feed
        """
        entries = await self._file_entries(user_id=user_id)

        self_url = self._urls.all_files()
        return OpdsFeed(
            id=self_url,
            title="All Files",
            author=CATALOG_AUTHOR,
            updated=max((e.updated for e in entries), default=datetime.now(UTC)),
            links=self._nav_links(
                up_url=self._urls.root(),
                up_type=OpdsLinkType.NAVIGATION,
                self_url=self_url,
                self_type=OpdsLinkType.ACQUISITION,
            ),
            entries=entries,
        )

    async def get_shelf_feed(self, user_id: UUID) -> OpdsFeed:
        """
        Shelf (reading now)
        """

        files = await self._file_repo.list_in_progress(user_id)

        entries = []
        updated = datetime.now(UTC)

        if files:
            file_ids = [file.id for file in files]
            tags_by_file = await self._tags_repo.list_personalized_by_files(file_ids, user_id)
            states = await self._file_repo.list_states_by_file_ids(file_ids, user_id)

            entries = [self._file_entry(file, tags_by_file.get(file.id, []), states.get(file.id)) for file in files]

            #  Shelf changes when file read, not when a file is edited
            updated = max(state.last_read_at or state.updated_at for state in states.values())

        self_url = self._urls.shelf()
        return OpdsFeed(
            id=self_url,
            title="Reading Now",
            author=CATALOG_AUTHOR,
            updated=updated,
            links=self._nav_links(
                up_url=self._urls.root(),
                up_type=OpdsLinkType.NAVIGATION,
                self_url=self_url,
                self_type=OpdsLinkType.ACQUISITION,
            ),
            entries=entries,
        )

    async def get_ollections_feed(self, user_id: UUID) -> OpdsFeed:
        """
        Root Collections (collections with no parent)
        """
        roots = await self._collection_repo.list_visible_to_user(user_id, roots_only=True)
        entries = [self._collection_entry(c) for c in roots]

        self_url = self._urls.collections()
        return OpdsFeed(
            id=self_url,
            title="Collections",
            author=CATALOG_AUTHOR,
            updated=max((e.updated for e in entries), default=datetime.now(UTC)),
            links=self._nav_links(
                up_url=self._urls.root(),
                up_type=OpdsLinkType.NAVIGATION,
                self_url=self_url,
                self_type=OpdsLinkType.NAVIGATION,
            ),
            entries=entries,
        )

    async def collection_feed(self, user_id: UUID, collection_id: UUID) -> OpdsFeed:
        """
        One collection
        """

        collection = await self._get_readable_collection(user_id=user_id, collection_id=collection_id)

        children = await self._collection_repo.list_visible_to_user(user_id, direct_parent_id=collection_id)
        entries = [self._collection_entry(c) for c in children]

        # Only folders hold files.
        if collection.entity_type == "folder":
            entries += await self._file_entries(user_id=user_id, collection_id=collection_id)

        if collection.parent_id is None:
            up_url = self._urls.collections()
            up_type = OpdsLinkType.NAVIGATION
        else:
            try:
                parent_collection = await self._get_readable_collection(
                    user_id=user_id, collection_id=collection.parent_id
                )
                up_url = self._urls.collection(collection.parent_id)
                up_type = self._feed_type(parent_collection)
            except InsufficientPermissionError:
                up_url = self._urls.collections()
                up_type = OpdsLinkType.NAVIGATION

        self_url = self._urls.collection(collection_id)
        return OpdsFeed(
            id=self_url,
            title=collection.name,
            author=CATALOG_AUTHOR,
            updated=collection.updated_at,
            links=self._nav_links(
                up_url=up_url,
                up_type=up_type,
                self_url=self_url,
                self_type=self._feed_type(collection),
            ),
            entries=entries,
        )

    async def _get_readable_collection(self, *, user_id: UUID, collection_id: UUID) -> ORMCollection:
        perm = await self._permission_repo.get_effective_for_collection(collection_id=collection_id, user_id=user_id)
        if not perm or not perm.can_read:
            raise InsufficientPermissionError(action="read", resource="Collection", identifier=collection_id)

        collection = await self._collection_repo.get_by_id(collection_id)

        return collection

    async def _file_entries(
        self, *, user_id: UUID, collection_id: UUID | None = None, name: str | None = None
    ) -> list[OpdsEntry]:
        """
        Visible files
        """
        files = await self._file_repo.list_visible_to_user(user_id, collection_id=collection_id, name=name)
        if not files:
            return []

        tags_by_file = await self._tags_repo.list_personalized_by_files([f.id for f in files], user_id)
        return [self._file_entry(f, tags_by_file.get(f.id, [])) for f in files]

    @staticmethod
    def _feed_type(collection: ORMCollection) -> OpdsLinkType:
        """
        Only group holds sub-collections. Folder holds files
        """
        return OpdsLinkType.NAVIGATION if collection.entity_type == "group" else OpdsLinkType.ACQUISITION

    def _nav_links(self, *, up_url: str, up_type: str, self_url: str, self_type: str) -> list[OpdsLink]:
        """
        Nav links
        """
        return [
            OpdsLink(href=self._urls.root(), type=OpdsLinkType.NAVIGATION, rel=OpdsRel.START),
            OpdsLink(href=up_url, type=up_type, rel=OpdsRel.UP),
            OpdsLink(href=self_url, type=self_type, rel=OpdsRel.SELF),
            OpdsLink(
                href=self._urls.opensearch(),
                type=OpdsLinkType.OPENSEARCH,
                rel=OpdsRel.SEARCH,
                title="Search",
            ),
        ]

    def _file_entry(self, file: ORMFile, tags: list[PersonalizedTag], state: ORMFileState | None = None) -> OpdsEntry:
        """
        One downloadable file.
        """
        content = file.description

        # Used by shelf
        if state is not None:
            progress = f"Page {state.current_page} of {file.page_count}"
            content = f"{progress} - {content}" if content else progress

        return OpdsEntry(
            id=f"urn:pdfmanager:file:{file.id}",
            title=file.name,
            updated=file.updated_at,
            content=content,
            categories=[OpdsCategory(term=tag.name, label=tag.name) for tag in tags],
            links=[
                OpdsLink(
                    href=self._urls.download(file.id),
                    type=file.content_type,
                    rel=OpdsRel.ACQUISITION_OPEN,
                    title="Download",
                ),
                OpdsLink(
                    href=self._urls.thumbnail(file.id),
                    type=file.thumbnail_content_type,
                    rel=OpdsRel.THUMBNAIL,
                ),
            ],
        )

    def _collection_entry(self, collection: ORMCollection) -> OpdsEntry:
        """
        Navigation entry. Collection type: 'group'
        """
        return OpdsEntry(
            id=f"urn:pdfmanager:collection:{collection.id}",
            title=collection.name,
            updated=collection.updated_at,
            links=[
                OpdsLink(
                    href=self._urls.collection(collection.id),
                    type=self._feed_type(collection),
                    rel=OpdsRel.SUBSECTION,
                )
            ],
        )
