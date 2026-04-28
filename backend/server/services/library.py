from contextlib import asynccontextmanager
from io import BytesIO
from logging import getLogger
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from server.exceptions import (
    InsufficientPermissionError,
    InvalidActionError,
)
from server.infrastructure.pdf import PdfFile
from server.infrastructure.search import ContentFragment, SearchBackend
from server.infrastructure.storage import StorageBackend
from server.models import ORMCollection, ORMFile, ORMFileState, ORMTag, ORMUserTagPreference
from server.repositories import (
    CollectionRepository,
    FileRepository,
    FileWithDetails,
    PermissionAssignment,
    PermissionRepository,
    TagRepository,
)
from server.schemas.general import PdfStorageFile
from server.schemas.library import CreateCollectionRequest, LibraryTreeNode


class LibraryService:
    def __init__(
        self,
        collection_repo: CollectionRepository,
        file_repo: FileRepository,
        tags_repo: TagRepository,
        search_engine: SearchBackend,
        permission_repo: PermissionRepository,
        storage_backend: StorageBackend,
    ):
        self._collection_repo = collection_repo
        self._file_repo = file_repo
        self._tags_repo = tags_repo
        self._search_engine = search_engine
        self._permission_repo = permission_repo
        self._storage_backend = storage_backend
        self._logger = getLogger(__name__)

    async def get_collection(self, user_id: UUID, collection_id: UUID):

        collection = await self._collection_repo.get_by_id(collection_id)

        perm = await self._permission_repo.get_effective_for_collection(collection_id=collection_id, user_id=user_id)
        if not perm or not perm.can_read:
            raise InsufficientPermissionError(action="read", resource="Collection", identifier=collection_id)

        return collection

    async def create_collection(self, user_id: UUID, data: CreateCollectionRequest):
        if data.parent_id:
            perm = await self._permission_repo.get_effective_for_collection(data.parent_id, user_id)
            if not perm or not perm.can_modify:
                raise InsufficientPermissionError(action="create", resource="Collection", identifier=data.parent_id)

        collection = ORMCollection(
            name=data.name,
            entity_type=data.entity_type,
            parent_id=data.parent_id,
        )
        self._collection_repo.create(collection)
        await self._collection_repo.flush()

        # Only roots need a direct grant. Nested collections inherit.
        if not data.parent_id:
            await self._permission_repo.grant(collection.id, user_id, "owner")

        await self._collection_repo.commit()

    async def list_collections(self, user_id: UUID) -> list[ORMCollection]:
        # TODO ability to exclude read-only collections
        visible = await self._permission_repo.list_visible_collection_ids(user_id)
        if not visible:
            return []

        return await self._collection_repo.list_by_ids(visible)

    async def delete_collection(self, user_id: UUID, collection_id: UUID):
        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="delete", resource="Collection", identifier=collection_id)

        # Collect what needs external cleanup.
        files = await self._file_repo.list_all_in_collection_tree(collection_id)
        file_ids = [f.id for f in files]
        storage_keys = [k for f in files for k in (f.storage_key, f.thumbnail) if k]

        collection = await self._collection_repo.get_by_id(collection_id)
        await self._collection_repo.delete(collection)
        await self._collection_repo.commit()

        if file_ids:
            await self._search_engine.delete_by_docs(file_ids)

        await self._storage_backend.delete_many(storage_keys)

    async def delete_file(self, user_id: UUID, file_id: UUID):
        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="delete", resource="File", identifier=file_id)

        await self._file_repo.delete(file)
        await self._file_repo.commit()

        await self._storage_backend.delete(file.storage_key)
        await self._search_engine.delete_by_docs([file_id])

        if file.thumbnail:
            await self._storage_backend.delete(file.thumbnail)

    async def update_collection(self, user_id, collection_id, name, parent_id=None):
        collection = await self._collection_repo.get_by_id(collection_id)

        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="update", resource="Collection", identifier=collection_id)

        if parent_id == collection.id:
            raise InvalidActionError(rule="collection_parent_self", msg="Collection cannot be its own parent.")

        is_move = parent_id != collection.parent_id

        if is_move and not perm.is_owner:
            raise InsufficientPermissionError(action="move", resource="Collection", identifier=collection_id)

        if is_move and parent_id is not None:
            parent_perm = await self._permission_repo.get_effective_for_collection(parent_id, user_id)
            if not parent_perm or not parent_perm.is_owner:
                raise InsufficientPermissionError(action="move-target", resource="Collection", identifier=parent_id)

        collection.name = name
        collection.parent_id = parent_id
        await self._collection_repo.commit()

    async def resolve_tags(self, names: list[str]) -> list[ORMTag]:
        if not names:
            return []

        normalized = {name.strip().lower() for name in names if name.strip()}
        existing = await self._tags_repo.get_by_names(list(normalized))
        existing_by_name = {t.name.lower(): t for t in existing}

        tags: list[ORMTag] = []
        for name in normalized:
            tag = existing_by_name.get(name)
            if not tag:
                tag = ORMTag(name=name)
                self._tags_repo.save(tag)
            tags.append(tag)

        await self._tags_repo.flush()
        return tags

    async def update_file_state(
        self,
        file_id: UUID,
        user_id: UUID,
        current_page: int | None = None,
        scale: str | None = None,
        is_favorite: bool | None = None,
    ):

        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_read:
            raise InsufficientPermissionError(action="read", resource="File", identifier=file_id)

        state = await self._file_repo.get_state_or_none(file_id=file_id, user_id=user_id)
        if not state:
            state = ORMFileState(file_id=file_id, user_id=user_id)
            self._file_repo.save(state)
            await self._file_repo.flush()

        if current_page is not None:
            state.current_page = min(current_page, file.page_count)
        if scale is not None:
            state.scale = scale
        if is_favorite is not None:
            state.is_favorite = is_favorite

        await self._file_repo.commit()

    async def update_file(
        self,
        user_id: UUID,
        file_id: UUID,
        name: str,
        tags: list[str],
        collection_id: UUID,
        description: str | None = None,
    ):

        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="update", resource="File", identifier=file_id)

        parent_perm = await self._permission_repo.get_effective_for_collection(
            collection_id=collection_id, user_id=user_id
        )
        if not parent_perm or not parent_perm.can_modify:
            raise InsufficientPermissionError(action="update", resource="File", identifier=file_id)

        collection = await self._collection_repo.get_by_id(collection_id)
        if collection.entity_type != "folder":
            raise InvalidActionError(rule="file_collection_must_be_folder", msg="File can only be added to folders.")

        if file.name != name:
            file.name = name
            await self._search_engine.delete_fragments(doc_id=file.id, fragment_type="name")
            await self._search_engine.index(
                [
                    ContentFragment(
                        content=name,
                        doc_id=file.id,
                        entity_type=file.content_type,
                        fragment_type="name",
                    ),
                ]
            )

        if file.description != description:
            file.description = description
            await self._search_engine.delete_fragments(doc_id=file.id, fragment_type="description")
            await self._search_engine.index(
                [
                    ContentFragment(
                        content=description or "",
                        doc_id=file.id,
                        entity_type=file.content_type,
                        fragment_type="description",
                    ),
                ]
            )

        await self._tags_repo.delete_orphaned()

        resolved_tags = await self.resolve_tags(tags)
        await self._tags_repo.replace_file_tags(file_id=file_id, tags=resolved_tags)

        file.collection_id = collection_id

        await self._file_repo.commit()

    async def upload_pdf_file(
        self,
        file: UploadFile,
        name: str,
        collection_id: UUID,
        user_id: UUID,
        tags: list[str],
        description: str | None = None,
    ) -> ORMFile:
        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="modify", resource="Collection", identifier=collection_id)

        stored_file = await self._store_pdf_file(file=file, user_id=user_id)

        try:
            file_record = await self._create_file_record(
                file=stored_file,
                name=name,
                description=description,
                collection_id=collection_id,
                tags=tags,
            )

            await self._search_engine.index(
                [
                    ContentFragment(
                        content=name,
                        doc_id=file_record.id,
                        entity_type=file_record.content_type,
                        fragment_type="name",
                    ),
                    ContentFragment(
                        content=description or "",
                        doc_id=file_record.id,
                        entity_type=file_record.content_type,
                        fragment_type="description",
                    ),
                ]
            )

            return file_record
        except Exception:
            await self._storage_backend.delete(stored_file.storage_key)
            if stored_file.thumbnail:
                await self._storage_backend.delete(stored_file.thumbnail)
            raise

    async def _store_pdf_file(
        self,
        file: UploadFile,
        user_id: UUID,
    ) -> PdfStorageFile:
        filename = file.filename or "unnamed.pdf"

        stored_file = await self._storage_backend.save(scope=f"pdf/{str(user_id)}", filename=filename, data=file.file)

        async with self._storage_backend.open_path(stored_file.storage_key) as path:
            pfg_file = PdfFile(path)

            thumb_img = pfg_file.render_page_as_image(1)
            thumb_name = Path(filename).stem + thumb_img.extension

            thumb = await self._storage_backend.save(
                scope=f"thumbnails/{str(user_id)}", filename=thumb_name, data=BytesIO(thumb_img.image_bytes)
            )

        return PdfStorageFile(
            **stored_file.to_dict(),
            page_count=pfg_file.page_count,
            thumbnail=thumb.storage_key,
        )

    async def _create_file_record(
        self,
        file: PdfStorageFile,
        name: str,
        collection_id: UUID,
        tags: list[str],
        description: str | None = None,
    ):

        file_record = ORMFile(
            name=name,
            description=description,
            collection_id=collection_id,
            storage_key=file.storage_key,
            file_size=file.size,
            file_hash=file.hash,
            page_count=file.page_count,
            thumbnail=file.thumbnail,
            content_type=file.content_type,
        )

        self._file_repo.save(file_record)
        await self._file_repo.flush()

        await self._tags_repo.delete_orphaned()
        resolved_tags = await self.resolve_tags(tags)
        await self._tags_repo.replace_file_tags(file_id=file_record.id, tags=resolved_tags)

        await self._file_repo.commit()

        return file_record

    @asynccontextmanager
    async def open_file(self, storage_key: str):
        async with self._storage_backend.open_path(storage_key) as path:
            yield path

    async def get_file(self, user_id: UUID, file_id: UUID) -> FileWithDetails:

        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_read:
            raise InsufficientPermissionError(action="read", resource="File", identifier=file_id)

        state = await self._file_repo.get_state_or_none(file_id, user_id)

        tags_by_file = await self._tags_repo.list_personalized_by_files([file.id], user_id)

        return FileWithDetails(file=file, state=state, tags=tags_by_file.get(file.id, []))

    async def list_files(
        self,
        user_id: UUID,
        collection_id: UUID | None = None,
        is_favorite: bool | None = None,
        tags: list[str] | None = None,
        name: str | None = None,
        description: str | None = None,
    ) -> list[FileWithDetails]:
        files = await self._file_repo.list_visible_to_user(
            user_id, collection_id=collection_id, is_favorite=is_favorite, tags=tags, name=name, description=description
        )
        if not files:
            return []
        file_ids = [f.id for f in files]
        states = await self._file_repo.list_states(file_ids, user_id)
        states = {state.file_id: state for state in states}
        tags_by_file = await self._tags_repo.list_personalized_by_files(file_ids, user_id)
        return [
            FileWithDetails(
                file=f,
                state=states.get(f.id),
                tags=tags_by_file.get(f.id, []),
            )
            for f in files
        ]

    async def get_library_tree(self, user_id: UUID) -> list[LibraryTreeNode]:
        visible = await self._permission_repo.list_visible_collection_ids(user_id)
        if not visible:
            return []

        collections = await self._collection_repo.list_by_ids(visible)

        nodes = {
            c.id: LibraryTreeNode(
                id=c.id,
                name=c.name,
                entity_type=c.entity_type,
                parent_id=c.parent_id,
                children=[],
                # TODO
                # is_shared=True
            )
            for c in collections
        }
        roots = []
        for n in nodes.values():
            parent = nodes.get(n.parent_id) if n.parent_id else None
            if parent:
                parent.children.append(n)
            else:
                roots.append(n)
        return roots

    async def list_tags_with_details(self, user_id: UUID):
        return await self._tags_repo.list_personalized_with_details(user_id=user_id)

    async def update_tag(self, user_id: UUID, tag_id: UUID, color: str):

        tag = await self._tags_repo.get_personalized_by_id_or_none(tag_id=tag_id, user_id=user_id)

        if not tag:
            generic_tag = await self._tags_repo.get_by_id(tag_id=tag_id)

            tag = ORMUserTagPreference(tag_id=generic_tag.id, user_id=user_id, color="gray")
            self._tags_repo.save(tag)

        tag.color = color
        await self._tags_repo.commit()

    async def delete_library(self, user_id: UUID):
        files = await self._file_repo.list_owned_by(user_id)

        if files:
            await self._search_engine.delete_by_docs([f.id for f in files])

        await self._storage_backend.delete_scope(f"pdf/{str(user_id)}")
        await self._storage_backend.delete_scope(f"thumbnails/{str(user_id)}")

    async def list_collection_permissions(self, user_id: UUID, collection_id: UUID) -> list[PermissionAssignment]:
        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_read:
            raise InsufficientPermissionError(
                action="read",
                resource="Permissions",
                identifier=collection_id,
            )

        return await self._permission_repo.list_for_collection(collection_id)
