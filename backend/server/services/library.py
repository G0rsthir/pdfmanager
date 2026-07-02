from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from io import BytesIO
from logging import getLogger
from pathlib import Path
from typing import Literal
from uuid import UUID

from fastapi import UploadFile

from server.const import UNSET, FragmentType, UnsetEnum
from server.exceptions import (
    InsufficientPermissionError,
    InvalidActionError,
    UserNotFoundError,
)
from server.infrastructure.pdf import PdfFile
from server.infrastructure.search import ContentFragment, SearchBackend
from server.infrastructure.storage import StorageBackend
from server.models import (
    ORMAnnotation,
    ORMAuthor,
    ORMCollection,
    ORMFile,
    ORMFileState,
    ORMTag,
    ORMUserTagPreference,
)
from server.repositories import (
    AnnotationRepository,
    AuthorRepository,
    CollectionRepository,
    FileRepository,
    FileWithDetails,
    PermissionAssignment,
    PermissionRepository,
    TagRepository,
    UserRepository,
)
from server.schemas.general import PdfStorageFile
from server.schemas.library import CreateCollectionRequest, LibraryTreeNode, NormalizedRect


class LibraryService:
    def __init__(
        self,
        collection_repo: CollectionRepository,
        file_repo: FileRepository,
        tags_repo: TagRepository,
        search_engine: SearchBackend,
        permission_repo: PermissionRepository,
        storage_backend: StorageBackend,
        annotation_repo: AnnotationRepository,
        user_repo: UserRepository,
        authors_repo: AuthorRepository,
    ):
        self._collection_repo = collection_repo
        self._file_repo = file_repo
        self._tags_repo = tags_repo
        self._search_engine = search_engine
        self._permission_repo = permission_repo
        self._storage_backend = storage_backend
        self._annotation_repo = annotation_repo
        self._user_repo = user_repo
        self._authors_repo = authors_repo
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
        visible = await self._permission_repo.list_accessible_collection_ids(user_id)
        if not visible:
            return []

        return await self._collection_repo.list_by_ids(visible)

    async def list_move_targets_for_collection(self, user_id: UUID, source_id: UUID) -> list[ORMCollection]:
        """
        Collections the user can move 'source_id' into.
        """
        perm = await self._permission_repo.get_effective_for_collection(source_id, user_id)
        if not perm or not perm.can_modify:
            return []

        writable_ids = await self._permission_repo.list_accessible_collection_ids(user_id, ["modify", "owner"])

        if not writable_ids:
            return []

        candidates = [cid for cid in writable_ids if source_id != cid]

        cols = await self._collection_repo.list_by_ids(candidates)
        return [c for c in cols if c.entity_type == "group"]

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

    async def move_collection(self, source_id: UUID, parent_id: UUID | None, user_id: UUID):
        source = await self._collection_repo.get_by_id(source_id)

        if source.parent_id == parent_id:
            return

        if source.id == parent_id:
            raise InvalidActionError(rule="collection_parent_self", msg="Collection cannot be its own parent.")

        perm = await self._permission_repo.get_effective_for_collection(source_id, user_id)

        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="move-target", resource="Collection", identifier=source_id)

        if parent_id is None:
            source.parent_id = parent_id
            return

        parent = await self._collection_repo.get_by_id(parent_id)

        if parent.entity_type != "group":
            raise InvalidActionError(
                rule="collection_parent_must_be_group", msg="Collection can only be moved into groups."
            )

        parent_perm = await self._permission_repo.get_effective_for_collection(parent_id, user_id)

        if not parent_perm or not parent_perm.can_modify:
            raise InsufficientPermissionError(action="move-target", resource="Collection", identifier=source_id)

        source.parent_id = parent_id

    async def update_collection(self, user_id, collection_id, name, parent_id=None):
        collection = await self._collection_repo.get_by_id(collection_id)

        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="update", resource="Collection", identifier=collection_id)

        if parent_id != collection.parent_id:
            await self.move_collection(source_id=collection_id, parent_id=parent_id, user_id=user_id)

        collection.name = name
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

    async def resolve_authors(self, names: list[str]) -> list[ORMAuthor]:
        if not names:
            return []

        normalized = {name.strip().lower() for name in names if name.strip()}
        existing = await self._authors_repo.get_by_names(list(normalized))
        existing_by_name = {t.name.lower(): t for t in existing}

        authors: list[ORMAuthor] = []
        for name in normalized:
            author = existing_by_name.get(name)
            if not author:
                author = ORMAuthor(name=name)
                self._authors_repo.save(author)
            authors.append(author)

        await self._authors_repo.flush()
        return authors

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
            page = min(current_page, file.page_count)
            if state.current_page != page:
                state.current_page = page
                state.last_read_at = datetime.now(UTC)

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
        authors: list[str],
        published: date | None = None,
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
            await self._search_engine.delete_fragments(doc_id=file.id, fragment_type=FragmentType.TITLE)
            await self._search_engine.index(
                [
                    ContentFragment(
                        content=name,
                        doc_id=file.id,
                        entity_type=file.content_type,
                        fragment_type=FragmentType.TITLE,
                    ),
                ]
            )

        if file.description != description:
            file.description = description
            await self._search_engine.delete_fragments(doc_id=file.id, fragment_type=FragmentType.DESCRIPTION)
            await self._search_engine.index(
                [
                    ContentFragment(
                        content=description or "",
                        doc_id=file.id,
                        entity_type=file.content_type,
                        fragment_type=FragmentType.DESCRIPTION,
                    ),
                ]
            )

        await self._tags_repo.delete_orphaned()

        resolved_tags = await self.resolve_tags(tags)
        await self._tags_repo.replace_file_tags(file_id=file_id, tags=resolved_tags)

        resolved_authors = await self.resolve_authors(authors)
        await self._authors_repo.replace_file_authors(file_id=file_id, authors=resolved_authors)

        file.collection_id = collection_id
        file.published = published

        await self._file_repo.commit()

    async def upload_pdf_file(
        self,
        file: UploadFile,
        collection_id: UUID,
        user_id: UUID,
        tags: list[str],
        name: str | None = None,
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
                        content=file_record.name,
                        doc_id=file_record.id,
                        entity_type=file_record.content_type,
                        fragment_type=FragmentType.TITLE,
                    ),
                    ContentFragment(
                        content=file_record.description or "",
                        doc_id=file_record.id,
                        entity_type=file_record.content_type,
                        fragment_type=FragmentType.DESCRIPTION,
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
                metadata=pfg_file.metadata(),
            )

    async def _create_file_record(
        self,
        file: PdfStorageFile,
        collection_id: UUID,
        tags: list[str],
        authors: list[str] | None = None,
        name: str | None = None,
        description: str | None = None,
        published: date | None = None,
    ):

        meta = file.metadata
        resolved_name = name or meta.title or Path(file.original_name).stem
        resolved_description = description or meta.description
        resolved_authors = authors or meta.authors
        resolved_published = published or meta.published
        resolved_tags = tags or meta.subjects

        file_record = ORMFile(
            name=resolved_name,
            description=resolved_description,
            collection_id=collection_id,
            storage_key=file.storage_key,
            file_size=file.size,
            file_hash=file.hash,
            page_count=file.page_count,
            thumbnail=file.thumbnail,
            content_type=file.content_type,
            published=resolved_published,
        )

        self._file_repo.save(file_record)
        await self._file_repo.flush()

        await self._tags_repo.delete_orphaned()
        tag_records = await self.resolve_tags(resolved_tags)
        await self._tags_repo.replace_file_tags(file_id=file_record.id, tags=tag_records)

        await self._authors_repo.delete_orphaned()
        author_records = await self.resolve_authors(resolved_authors)
        await self._authors_repo.replace_file_authors(file_id=file_record.id, authors=author_records)

        await self._file_repo.commit()

        return file_record

    @asynccontextmanager
    async def open_file(self, storage_key: str):
        async with self._storage_backend.open_path(storage_key) as path:
            yield path

    async def list_move_targets_for_file(self, user_id: UUID, source_id: UUID) -> list[ORMCollection]:
        """
        Collections the user can move 'source_id' into.
        """
        file = await self._file_repo.get_by_id(source_id)
        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_modify:
            return []

        writable_ids = await self._permission_repo.list_accessible_collection_ids(user_id, ["modify", "owner"])

        if not writable_ids:
            return []

        cols = await self._collection_repo.list_by_ids(writable_ids)
        return [c for c in cols if c.entity_type == "folder"]

    async def list_distinct_labels(self, user_id: UUID):
        files = await self._file_repo.list_visible_to_user(user_id=user_id)
        if not files:
            return []
        file_ids = [f.id for f in files]
        annotation_labels = await self._annotation_repo.list_distinct_labels(file_ids)
        return sorted(annotation_labels)

    async def list_annotations(self, user_id: UUID, file_id: UUID):

        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_read:
            raise InsufficientPermissionError(action="read", resource="File", identifier=file_id)

        return await self._annotation_repo.list_by_file(file_id)

    async def list_authors_visible_to_user(self, user_id: UUID) -> list[ORMAuthor]:
        files = await self._file_repo.list_visible_to_user(user_id)

        return await self._authors_repo.list_distinct_by_files([f.id for f in files])

    async def create_annotation(
        self,
        user_id: UUID,
        file_id: UUID,
        page: int,
        body: str,
        color: str,
        excerpt: str,
        rects: list[NormalizedRect],
        label: str | None,
    ):

        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="write", resource="File", identifier=file_id)

        annotation = ORMAnnotation(
            page=page,
            body=body,
            excerpt=excerpt,
            rects=[rect.model_dump() for rect in rects],
            label=label,
            color=color,
            file_id=file_id,
            author_id=user_id,
        )

        self._annotation_repo.save(annotation)
        await self._annotation_repo.commit()

        fragments = [
            ContentFragment(
                content=annotation.body,
                doc_id=file.id,
                entity_type=file.content_type,
                fragment_type=FragmentType.ANNOTATION,
                source_id=annotation.id,
                page_number=annotation.page,
                field="body",
            ),
            ContentFragment(
                content=annotation.excerpt,
                doc_id=file.id,
                entity_type=file.content_type,
                fragment_type=FragmentType.ANNOTATION,
                source_id=annotation.id,
                page_number=annotation.page,
                field="excerpt",
            ),
        ]

        await self._search_engine.index(fragments)

    async def patch_annotation(
        self,
        user_id: UUID,
        file_id: UUID,
        annotation_id: UUID,
        color: str | None = None,
        body: str | None = None,
        label: str | None | UnsetEnum = UNSET,
    ):

        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="write", resource="File", identifier=file_id)

        annotation = await self._annotation_repo.get_by_id(annotation_id)
        if annotation.file_id != file_id:
            raise InvalidActionError(
                rule="file_annotation_mismatch", msg="Annotation does not belong to the specified file."
            )

        if label is not UNSET:
            annotation.label = label

        annotation.body = body or annotation.body
        annotation.color = color or annotation.color

        await self._annotation_repo.commit()

        await self._search_engine.delete_fragment_by_source(annotation.id)

        fragments = [
            ContentFragment(
                content=annotation.body,
                doc_id=file.id,
                entity_type=file.content_type,
                fragment_type=FragmentType.ANNOTATION,
                source_id=annotation.id,
                page_number=annotation.page,
                field="body",
            ),
            ContentFragment(
                content=annotation.excerpt,
                doc_id=file.id,
                entity_type=file.content_type,
                fragment_type=FragmentType.ANNOTATION,
                source_id=annotation.id,
                page_number=annotation.page,
                field="excerpt",
            ),
        ]

        await self._search_engine.index(fragments)

    async def delete_annotation(self, user_id: UUID, file_id: UUID, annotation_id: UUID):
        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(action="modify", resource="File", identifier=file_id)

        annotation = await self._annotation_repo.get_by_id(annotation_id)

        if annotation.file_id != file_id:
            raise InvalidActionError(
                rule="file_annotation_mismatch", msg="Annotation does not belong to the specified file."
            )
        await self._annotation_repo.delete(annotation)
        await self._annotation_repo.commit()
        await self._search_engine.delete_fragment_by_source(annotation.id)

    async def get_file(self, user_id: UUID, file_id: UUID) -> FileWithDetails:

        file = await self._file_repo.get_by_id(file_id)

        perm = await self._permission_repo.get_effective_for_file(file=file, user_id=user_id)
        if not perm or not perm.can_read:
            raise InsufficientPermissionError(action="read", resource="File", identifier=file_id)

        state = await self._file_repo.get_state_or_none(file_id, user_id)

        tags_by_file = await self._tags_repo.list_personalized_by_files([file.id], user_id)

        authors_by_file = await self._authors_repo.list_by_files([file.id])

        return FileWithDetails(
            file=file,
            state=state,
            tags=tags_by_file.get(file.id, []),
            permissions=[perm],
            authors=authors_by_file.get(file.id, []),
        )

    async def list_files(
        self,
        user_id: UUID,
        collection_id: UUID | None = None,
        is_favorite: bool | None = None,
        tags: list[str] | None = None,
        authors: list[str] | None = None,
        name: str | None = None,
        description: str | None = None,
    ) -> list[FileWithDetails]:
        files = await self._file_repo.list_visible_to_user(
            user_id,
            collection_id=collection_id,
            is_favorite=is_favorite,
            tags=tags,
            name=name,
            description=description,
            authors=authors,
        )
        if not files:
            return []
        file_ids = [f.id for f in files]
        states = await self._file_repo.list_states(file_ids, user_id)
        states = {state.file_id: state for state in states}
        tags_by_file = await self._tags_repo.list_personalized_by_files(file_ids, user_id)
        authors_by_file = await self._authors_repo.list_by_files(file_ids)

        return [
            FileWithDetails(
                file=f,
                state=states.get(f.id),
                tags=tags_by_file.get(f.id, []),
                permissions=[],
                authors=authors_by_file.get(f.id, []),
            )
            for f in files
        ]

    async def get_library_tree(self, user_id: UUID) -> list[LibraryTreeNode]:
        visible = await self._permission_repo.list_accessible_collection_ids(user_id)
        if not visible:
            return []

        collections = await self._collection_repo.list_by_ids(visible)
        grants = await self._permission_repo.list_direct_grants_by_resource(visible)

        nodes = {
            c.id: LibraryTreeNode(
                id=c.id,
                name=c.name,
                entity_type=c.entity_type,
                parent_id=c.parent_id,
                children=[],
            )
            for c in collections
        }
        roots = []
        for n in nodes.values():
            parent = nodes.get(n.parent_id) if n.parent_id else None

            # Calculate permissions for the current user on this node,
            # which will be helpful for frontend rendering and permission checks.
            relevant_grants = grants.get(n.id, [])
            n.target_permission = next((g.permission for g in relevant_grants if g.user_id == user_id), None)
            n.target_permission_count = len(relevant_grants)

            if parent:
                parent.children.append(n)
                n.target_parent = parent
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

    async def delete_collection_permission(self, user_id: UUID, collection_id: UUID, assignment_id: UUID):

        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(
                action="modify",
                resource="Permissions",
                identifier=collection_id,
            )

        assignment = await self._permission_repo.get_by_id_or_none(assignment_id)

        if not assignment or assignment.resource_id != collection_id:
            raise InvalidActionError(
                rule="permission_assignment_mismatch",
                msg="Permission assignment does not belong to the specified collection.",
            )

        if assignment.is_owner:
            raise InvalidActionError(
                rule="delete_owner_permission",
                msg="Owner permissions cannot be deleted.",
            )

        await self._permission_repo.delete(assignment)
        await self._permission_repo.commit()

    async def update_collection_permission(
        self, user_id: UUID, collection_id: UUID, assignment_id: UUID, permission: Literal["read", "modify"]
    ):
        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(
                action="modify",
                resource="Permissions",
                identifier=collection_id,
            )

        assignment = await self._permission_repo.get_by_id_or_none(assignment_id)

        if not assignment or assignment.resource_id != collection_id:
            raise InvalidActionError(
                rule="permission_assignment_mismatch",
                msg="Permission assignment does not belong to the specified collection.",
            )

        if assignment.is_owner:
            raise InvalidActionError(
                rule="update_owner_permission",
                msg="Owner permissions cannot be modified.",
            )

        assignment.permission = permission
        await self._permission_repo.commit()

    async def invite_to_collection(
        self, user_id: UUID, collection_id: UUID, email: str, permission: Literal["read", "modify"]
    ):

        perm = await self._permission_repo.get_effective_for_collection(collection_id, user_id)
        if not perm or not perm.can_modify:
            raise InsufficientPermissionError(
                action="invite",
                resource="Permissions",
                identifier=collection_id,
                user=user_id,
            )

        user = await self._user_repo.get_by_email(email)

        if not user:
            raise UserNotFoundError(email)

        if user.id == user_id:
            raise InvalidActionError(
                rule="invite_self",
                msg="Users cannot invite themselves to collections.",
            )

        perm = await self._permission_repo.get_effective_for_collection(collection_id, user.id)

        if perm and perm.is_owner:
            raise InvalidActionError(
                rule="invite_owner",
                msg="User is already an owner of the collection.",
            )

        await self._permission_repo.grant(resource_id=collection_id, user_id=user.id, permission=permission)
        await self._permission_repo.commit()
