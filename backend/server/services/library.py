from dataclasses import dataclass
from uuid import UUID

from server.const import UNSET, UnsetEnum
from server.exceptions import (
    CollectionNotFoundError,
    FolderNotFoundError,
    InvalidActionError,
    LibraryFileNotFoundError,
    TagNotFoundError,
)
from server.models import ORMCollection, ORMFile, ORMFolder, ORMTag
from server.repositories import CollectionRepository, FileRepository, FolderRepository, TagRepository
from server.schemas.library import LibraryTreeNode


@dataclass(kw_only=True)
class TagWithDetails:
    id: UUID
    name: str
    color: str
    file_count: int


class LibraryService:
    def __init__(
        self,
        collection_repo: CollectionRepository,
        folder_repo: FolderRepository,
        file_repo: FileRepository,
        tags_repo: TagRepository,
    ):
        self.collection_repo = collection_repo
        self.folder_repo = folder_repo
        self.file_repo = file_repo
        self.tags_repo = tags_repo

    async def create_collection(self, user_id: UUID, name: str, parent_id: UUID | None = None):

        if not parent_id:
            collection = ORMCollection(name=name, user_id=user_id)
            self.collection_repo.create(collection)
            return

        parent_collection = await self.collection_repo.get_by_id_or_none(parent_id)

        if not parent_collection:
            raise CollectionNotFoundError(identifier=parent_id, msg=f"Parent collection with id {parent_id} not found")

        collection = ORMCollection(name=name, parent_id=parent_id, user_id=user_id)
        self.collection_repo.create(collection)
        await self.collection_repo.commit()

    async def list_collections(self, user_id: UUID):
        return await self.collection_repo.get_by_user_id(user_id=user_id)

    async def list_folders(self, user_id: UUID):
        return await self.folder_repo.get_by_user_id(user_id=user_id)

    async def create_folder(self, user_id: UUID, name: str, parent_id: UUID | None = None):

        if not parent_id:
            folder = ORMFolder(name=name, user_id=user_id)
            self.folder_repo.create(folder)
            return

        parent_collection = await self.collection_repo.get_by_id_or_none(parent_id)

        if not parent_collection:
            raise CollectionNotFoundError(identifier=parent_id, msg=f"Parent collection with id {parent_id} not found")

        folder = ORMFolder(name=name, collection_id=parent_id, user_id=user_id)
        self.folder_repo.create(folder)
        await self.folder_repo.commit()

    async def delete_collection(self, user_id: UUID, collection_id: UUID):
        collection = await self.collection_repo.get_by_id(collection_id)

        if collection.user_id != user_id:
            raise CollectionNotFoundError(
                identifier=collection_id, msg=f"Collection with id {collection_id} not found."
            )

        await self.collection_repo.delete(collection)
        await self.collection_repo.commit()

    async def delete_folder(self, user_id: UUID, folder_id: UUID):
        folder = await self.folder_repo.get_by_id(folder_id)

        if folder.user_id != user_id:
            raise CollectionNotFoundError(identifier=folder_id, msg=f"Folder with id {folder_id} not found.")

        await self.folder_repo.delete(folder)
        await self.folder_repo.commit()

    async def delete_file(self, user_id: UUID, file_id: UUID):
        file = await self.file_repo.get_by_id(file_id)

        if file.user_id != user_id:
            raise LibraryFileNotFoundError(identifier=file_id, msg=f"File with id {file_id} not found.")

        await self.file_repo.delete(file)
        await self.file_repo.commit()

    async def delete_tag(self, user_id: UUID, tag_id: UUID):
        tag = await self.tags_repo.get_by_id(tag_id)

        if tag.user_id != user_id:
            raise TagNotFoundError(identifier=tag_id, msg=f"Tag with id {tag_id} not found.")

        await self.tags_repo.delete(tag)
        await self.tags_repo.commit()

    async def update_collection(self, user_id: UUID, collection_id: UUID, name: str, parent_id: UUID | None = None):
        collection = await self.collection_repo.get_by_id(collection_id)

        if collection.user_id != user_id:
            raise CollectionNotFoundError(
                identifier=collection_id, msg=f"Collection with id {collection_id} not found."
            )

        if parent_id == collection.id:
            raise InvalidActionError(rule="collection_parent_self", msg="Collection cannot be its own parent.")

        if parent_id:
            parent_collection = await self.collection_repo.get_by_id_or_none(parent_id)

            if not parent_collection or parent_collection.user_id != user_id:
                raise CollectionNotFoundError(
                    identifier=parent_id, msg=f"Parent collection with id {parent_id} not found"
                )

        collection.name = name
        collection.parent_id = parent_id
        await self.collection_repo.commit()

    async def update_folder(self, user_id: UUID, folder_id: UUID, name: str, parent_id: UUID | None = None):
        folder = await self.folder_repo.get_by_id(folder_id)

        if folder.user_id != user_id:
            raise CollectionNotFoundError(identifier=folder_id, msg=f"Folder with id {folder_id} not found.")

        if parent_id:
            parent_collection = await self.collection_repo.get_by_id_or_none(parent_id)

            if not parent_collection or parent_collection.user_id != user_id:
                raise CollectionNotFoundError(
                    identifier=parent_id, msg=f"Parent collection with id {parent_id} not found"
                )

        folder.name = name
        folder.collection_id = parent_id
        await self.folder_repo.commit()

    async def resolve_tags(self, user_id: UUID, names: list[str]) -> list[ORMTag]:
        if not names:
            return []

        existing = await self.tags_repo.get_by_names(user_id, names)
        existing_by_name = {t.name.lower(): t for t in existing}

        tags: list[ORMTag] = []
        for name in names:
            tag = existing_by_name.get(name.lower())
            if not tag:
                tag = ORMTag(name=name, color="gray", user_id=user_id)
                self.tags_repo.save(tag)
            tags.append(tag)
        await self.tags_repo.flush()
        return tags

    async def update_file_state(
        self,
        file_id: UUID,
        user_id: UUID,
        current_page: int | None = None,
        scale: str | None = None,
    ):
        file = await self.file_repo.get_by_id(file_id)

        if not file or file.user_id != user_id:
            raise LibraryFileNotFoundError(identifier=file_id, msg=f"File with id {file_id} not found.")

        if current_page is not None:
            file.current_page = min(current_page, file.page_count)
        if scale is not None:
            file.scale = scale
        await self.file_repo.commit()

    async def update_file(
        self,
        user_id: UUID,
        file_id: UUID,
        name: str,
        tags: list[str],
        is_favorite: bool = False,
        description: str | None = None,
        folder_id: UUID | None = None,
    ):
        file = await self.file_repo.get_by_id(file_id)

        if not file or file.user_id != user_id:
            raise LibraryFileNotFoundError(identifier=file_id, msg=f"File with id {file_id} not found.")

        if folder_id:
            parent_folder = await self.folder_repo.get_by_id_or_none(folder_id)

            if not parent_folder or parent_folder.user_id != user_id:
                raise FolderNotFoundError(identifier=folder_id, msg=f"Parent folder with id {folder_id} not found")

        file.name = name
        file.description = description
        file.tags = await self.resolve_tags(user_id, tags)
        file.folder_id = folder_id
        file.is_favorite = is_favorite
        file.folder_id = folder_id
        await self.file_repo.commit()

    async def create_file(
        self,
        name: str,
        folder_id: UUID,
        user_id: UUID,
        file_storage: str,
        file_size: int,
        file_hash: str,
        tags: list[str],
        page_count: int,
        description: str | None = None,
    ):
        resolved_tags = await self.resolve_tags(user_id, tags)

        file = ORMFile(
            name=name,
            description=description,
            folder_id=folder_id,
            user_id=user_id,
            file_storage=file_storage,
            file_size=file_size,
            file_hash=file_hash,
            tags=resolved_tags,
            page_count=page_count,
        )

        self.file_repo.save(file)
        await self.file_repo.commit()

    async def get_file(self, user_id: UUID, file_id: UUID):
        file = await self.file_repo.get_by_id(file_id)

        if not file or file.user_id != user_id:
            raise LibraryFileNotFoundError(identifier=file_id, msg=f"File with id {file_id} not found.")
        return file

    async def get_folder(self, user_id: UUID, folder_id: UUID) -> ORMFolder:
        folder = await self.folder_repo.get_by_id(folder_id)

        if folder.user_id != user_id:
            raise CollectionNotFoundError(identifier=folder_id, msg=f"Folder with id {folder_id} not found.")

        return folder

    async def list_files(
        self,
        user_id: UUID,
        folder_id: UUID | None | UnsetEnum = UNSET,
        is_favorite: bool | None = None,
        tags: list[str] | None = None,
        text: list[str] | None = None,
        names: list[str] | None = None,
        descriptions: list[str] | None = None,
    ) -> list[ORMFile]:

        return await self.file_repo.get_list(
            user_id=user_id,
            folder_id=folder_id,
            is_favorite=is_favorite,
            tags=tags,
            text=text,
            names=names,
            descriptions=descriptions,
        )

    async def get_library_tree(self, user_id: UUID) -> list[LibraryTreeNode]:
        collections = await self.collection_repo.get_by_user_id(user_id)
        folders = await self.folder_repo.get_by_user_id(user_id)

        library_roots: list[LibraryTreeNode] = []
        collection_map: dict[UUID, LibraryTreeNode] = {}

        for col in collections:
            node = LibraryTreeNode(
                id=col.id, name=col.name, children=[], entity_type="collection", parent_id=col.parent_id
            )
            collection_map[col.id] = node
            if not col.parent_id:
                library_roots.append(node)

        for folder in folders:
            node = LibraryTreeNode(
                id=folder.id, name=folder.name, children=[], entity_type="folder", parent_id=folder.collection_id
            )
            if not folder.collection_id:
                library_roots.append(node)
                continue
            parent_node = collection_map[folder.collection_id]
            parent_node.children.append(node)

        for col in collections:
            if not col.parent_id:
                continue

            parent_node = collection_map[col.parent_id]
            parent_node.children.append(collection_map[col.id])

        return library_roots

    async def list_tags_with_details(self, user_id: UUID):
        tags = await self.tags_repo.get_with_file_counts(user_id=user_id)

        return [TagWithDetails(id=tag.id, name=tag.name, color=tag.color, file_count=count) for tag, count in tags]

    async def update_tag(self, user_id: UUID, tag_id: UUID, name: str, color: str):
        tag = await self.tags_repo.get_by_id(tag_id)

        if not tag or tag.user_id != user_id:
            raise TagNotFoundError(identifier=tag_id, msg=f"Tag with id {tag_id} not found.")

        tag_with_name = await self.tags_repo.get_by_name(user_id=user_id, tag_name=name)

        if tag_with_name and tag_with_name.id != tag_id:
            raise InvalidActionError(rule="tag_name_exists", msg=f"Tag with name {name} already exists.")

        tag.name = name
        tag.color = color
        await self.tags_repo.commit()
