from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from server import models
from server.const import UNSET, UnsetEnum
from server.exceptions import (
    AuthProviderNotFoundError,
    CollectionNotFoundError,
    FolderNotFoundError,
    LibraryFileNotFoundError,
    RoleNotFoundError,
    SessionNotFoundError,
    TagNotFoundError,
    UserNotFoundError,
)


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_required(self, user_id: UUID):
        record = await self.session.get(models.ORMUser, user_id)
        if not record:
            raise UserNotFoundError(user_id)
        return record

    async def get_by_email(self, email: str) -> models.ORMUser | None:
        record = await self.session.scalar(
            select(models.ORMUser).where(func.lower(models.ORMUser.email) == email.lower())
        )
        return record

    def create(self, session: models.ORMUser) -> None:
        self.session.add(session)

    async def is_initial_user_exists(self) -> bool:
        """
        Check if atleast one user exists.
        """
        user = await self.session.scalar(select(models.ORMUser))
        if user:
            return True
        return False


class RoleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_required(self, role_id: UUID):
        record = await self.session.get(models.ORMUserRole, role_id)
        if not record:
            raise RoleNotFoundError(role_id)
        return record

    async def get_by_name(self, role_name: str) -> models.ORMUserRole | None:
        record = await self.session.scalar(
            select(models.ORMUserRole).where(func.lower(models.ORMUserRole.name) == role_name.lower())
        )
        return record


class AuthProviderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_required(self, provider_id: UUID):
        record = await self.session.get(models.ORMAuthProvider, provider_id)
        if not record:
            raise AuthProviderNotFoundError(provider_id)
        return record

    async def get_by_name(self, provider_name: str) -> models.ORMAuthProvider | None:
        record = await self.session.scalar(
            select(models.ORMAuthProvider).where(func.lower(models.ORMAuthProvider.name) == provider_name.lower())
        )
        return record


class SessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_required(self, session_id: UUID):
        record = await self.session.get_one(models.ORMSession, session_id)
        if not record:
            raise SessionNotFoundError(session_id)
        return record

    async def revoke_by_id(self, session_id: UUID):
        session_record = await self.session.get(models.ORMSession, session_id)

        if not session_record:
            return
        session_record.is_revoked = True

        self.session.add(session_record)

    async def revoke(self, session: models.ORMSession):
        session.is_revoked = True
        self.session.add(session)

    def create(self, session: models.ORMSession) -> None:
        self.session.add(session)


class CollectionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, collection_id: UUID) -> models.ORMCollection | None:
        record = await self.session.get(models.ORMCollection, collection_id)
        return record

    async def get_required(self, collection_id: UUID):
        record = await self.session.get(models.ORMCollection, collection_id)
        if not record:
            raise CollectionNotFoundError(collection_id)
        return record

    async def get_by_name(self, collection_name: str) -> models.ORMCollection | None:
        record = await self.session.scalar(
            select(models.ORMCollection).where(func.lower(models.ORMCollection.name) == collection_name.lower())
        )
        return record

    async def get_by_user_id(self, user_id: UUID) -> list[models.ORMCollection]:
        records = await self.session.scalars(
            select(models.ORMCollection).where(models.ORMCollection.user_id == user_id)
        )
        return list(records.all())

    def create(self, collection: models.ORMCollection) -> None:
        self.session.add(collection)

    async def delete(self, collection: models.ORMCollection) -> None:
        await self.session.delete(collection)


class FolderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, folder_id: UUID) -> models.ORMFolder | None:
        record = await self.session.get(models.ORMFolder, folder_id)
        return record

    async def get_required(self, folder_id: UUID):
        record = await self.session.get(models.ORMFolder, folder_id)
        if not record:
            raise FolderNotFoundError(folder_id)
        return record

    async def get_by_name(self, folder_name: str) -> models.ORMFolder | None:
        record = await self.session.scalar(
            select(models.ORMFolder).where(func.lower(models.ORMFolder.name) == folder_name.lower())
        )
        return record

    async def get_by_user_id(self, user_id: UUID) -> list[models.ORMFolder]:
        records = await self.session.scalars(select(models.ORMFolder).where(models.ORMFolder.user_id == user_id))
        return list(records.all())

    def create(self, folder: models.ORMFolder) -> None:
        self.session.add(folder)

    async def delete(self, folder: models.ORMFolder) -> None:
        await self.session.delete(folder)


class FileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_required(self, file_id: UUID):
        record = await self.session.get(models.ORMFile, file_id)
        if not record:
            raise LibraryFileNotFoundError(file_id)
        return record

    async def get_list(
        self,
        user_id: UUID,
        folder_id: UUID | None | UnsetEnum = UNSET,
        is_favorite: bool | None = None,
        tags: list[str] | None = None,
        text: list[str] | None = None,
        names: list[str] | None = None,
        descriptions: list[str] | None = None,
    ):
        stmt = select(models.ORMFile).where(models.ORMFile.user_id == user_id)

        if is_favorite is not None:
            stmt = stmt.where(models.ORMFile.is_favorite == is_favorite)

        if folder_id is not UNSET:
            stmt = stmt.where(models.ORMFile.folder_id == folder_id)

        if tags:
            for tag in tags:
                stmt = stmt.where(models.ORMFile.tags.any(models.ORMTag.name == tag))

        if text:
            for term in text:
                pattern = f"%{term}%"
                stmt = stmt.where(models.ORMFile.name.ilike(pattern) | models.ORMFile.description.ilike(pattern))

        if names:
            for name in names:
                pattern = f"%{name}%"
                stmt = stmt.where(models.ORMFile.name.ilike(pattern))

        if descriptions:
            for description in descriptions:
                pattern = f"%{description}%"
                stmt = stmt.where(models.ORMFile.description.ilike(pattern))

        records = await self.session.scalars(stmt)
        return list(records.all())

    def save(self, folder: models.ORMFile) -> None:
        self.session.add(folder)

    async def delete(self, file: models.ORMFile) -> None:
        await self.session.delete(file)

    async def count_by_storage(self, file_storage: str) -> int:
        stmt = select(func.count()).where(models.ORMFile.file_storage == file_storage)
        return await self.session.scalar(stmt) or 0


class TagRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_required(self, tag_id: UUID):
        record = await self.session.get(models.ORMTag, tag_id)
        if not record:
            raise TagNotFoundError(tag_id)
        return record

    async def get_by_name(self, user_id: UUID, tag_name: str) -> models.ORMTag | None:
        record = await self.session.scalar(
            select(models.ORMTag).where(
                func.lower(models.ORMTag.name) == tag_name.lower(), models.ORMTag.user_id == user_id
            )
        )
        return record

    def save(self, tag: models.ORMTag) -> None:
        self.session.add(tag)

    async def delete(self, tag: models.ORMTag) -> None:
        await self.session.delete(tag)

    async def get_by_user_id(self, user_id: UUID) -> list[models.ORMTag]:
        records = await self.session.scalars(select(models.ORMTag).where(models.ORMTag.user_id == user_id))
        return list(records.all())

    async def get_with_file_counts(self, user_id: UUID) -> list[tuple[models.ORMTag, int]]:
        stmt = (
            select(models.ORMTag, func.count(models.file_tags.c.file_id).label("file_count"))
            .outerjoin(models.file_tags, models.ORMTag.id == models.file_tags.c.tag_id)
            .where(models.ORMTag.user_id == user_id)
            .group_by(models.ORMTag.id)
        )
        rows = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in rows.all()]

    async def get_by_names(self, user_id: UUID, names: list[str]) -> list[models.ORMTag]:
        if not names:
            return []

        records = await self.session.scalars(
            select(models.ORMTag).where(
                models.ORMTag.user_id == user_id, func.lower(models.ORMTag.name).in_([n.lower() for n in names])
            )
        )
        return list(records.all())
