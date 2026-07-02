from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import and_, delete, exists, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from server import models
from server.const import RESOURCE_PERMISSIONS, SessionTypeEnum
from server.exceptions import (
    AnnotationNotFoundError,
    AuthProviderNotFoundError,
    CollectionNotFoundError,
    LibraryFileNotFoundError,
    RoleNotFoundError,
    SessionNotFoundError,
    TagNotFoundError,
    UserNotFoundError,
)


class Repository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def commit(self):
        await self.session.commit()

    async def flush(self):
        await self.session.flush()


class UserRepository(Repository):
    async def get_by_id(self, user_id: UUID):
        record = await self.session.get(models.ORMUser, user_id)
        if not record:
            raise UserNotFoundError(user_id)
        return record

    async def get_by_id_or_none(self, user_id: UUID):
        return await self.session.get(models.ORMUser, user_id)

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

    async def get_list(self) -> list[models.ORMUser]:
        records = await self.session.scalars(select(models.ORMUser))
        return list(records.all())

    async def delete(self, user: models.ORMUser) -> None:
        await self.session.delete(user)

    async def count_by_role_id(self, role_id: UUID, only_enabled: bool = False) -> int:
        stmt = select(func.count()).where(models.ORMUser.role_id == role_id)
        if only_enabled:
            stmt = stmt.where(models.ORMUser.is_enabled)
        return await self.session.scalar(stmt) or 0

    async def list_by_ids(self, user_ids: list[UUID]) -> dict[UUID, models.ORMUser]:
        if not user_ids:
            return {}
        stmt = select(models.ORMUser).where(models.ORMUser.id.in_(set(user_ids)))
        records = await self.session.scalars(stmt)
        return {record.id: record for record in records.all()}


class RoleRepository(Repository):
    async def get_by_id(self, role_id: UUID):
        record = await self.session.get(models.ORMUserRole, role_id)
        if not record:
            raise RoleNotFoundError(role_id)
        return record

    async def get_by_name(self, role_name: str) -> models.ORMUserRole | None:
        record = await self.session.scalar(
            select(models.ORMUserRole).where(func.lower(models.ORMUserRole.name) == role_name.lower())
        )
        return record

    async def get_list(self) -> list[models.ORMUserRole]:
        records = await self.session.scalars(select(models.ORMUserRole))
        return list(records.all())

    async def get_by_user_id(self, user_id: UUID) -> models.ORMUserRole | None:
        stmt = (
            select(models.ORMUserRole)
            .join(models.ORMUser, models.ORMUser.role_id == models.ORMUserRole.id)
            .where(models.ORMUser.id == user_id)
        )
        return await self.session.scalar(stmt)


class AuthProviderRepository(Repository):
    async def get_by_id(self, provider_id: UUID):
        record = await self.session.get(models.ORMAuthProvider, provider_id)
        if not record:
            raise AuthProviderNotFoundError(provider_id)
        return record

    async def get_oidc_by_id(self, provider_id: UUID):
        record = await self.session.get(models.ORMAuthProviderOidc, provider_id)
        if not record:
            raise AuthProviderNotFoundError(provider_id)
        return record

    async def get_local_by_id(self, provider_id: UUID):
        record = await self.session.get(models.ORMAuthProviderLocal, provider_id)
        if not record:
            raise AuthProviderNotFoundError(provider_id)
        return record

    async def get_by_name(self, provider_name: str) -> models.ORMAuthProvider | None:
        record = await self.session.scalar(
            select(models.ORMAuthProvider).where(func.lower(models.ORMAuthProvider.name) == provider_name.lower())
        )
        return record

    async def get_list(self) -> list[models.ORMAuthProvider]:
        records = await self.session.scalars(select(models.ORMAuthProvider))
        return list(records.all())

    async def get_oidc_list(self) -> list[models.ORMAuthProviderOidc]:
        records = await self.session.scalars(select(models.ORMAuthProviderOidc))
        return list(records.all())

    def create(self, session: models.ORMAuthProvider):
        self.session.add(session)

    async def delete(self, provider: models.ORMAuthProvider):
        await self.session.delete(provider)

    async def disable_auto_login_for_all_providers(self, except_provider_id: UUID | None = None):
        stmt = select(models.ORMAuthProviderOidc).where(models.ORMAuthProviderOidc.auto_login)
        records = await self.session.scalars(stmt)
        for record in records.all():
            if except_provider_id is not None and record.id == except_provider_id:
                continue
            record.auto_login = False
            self.session.add(record)


class SessionRepository(Repository):
    async def get_by_id(self, session_id: UUID):
        record = await self.session.get(models.ORMSession, session_id)
        if not record:
            raise SessionNotFoundError(session_id)
        return record

    async def get_by_id_or_none(self, session_id: UUID):
        return await self.session.get(models.ORMSession, session_id)

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

    async def get_list(
        self, include_revoked: bool = False, session_type: list[SessionTypeEnum] | None = None
    ) -> list[models.ORMSession]:
        stmt = select(models.ORMSession)
        if not include_revoked:
            stmt = stmt.where(~models.ORMSession.is_revoked)
        if session_type is not None:
            stmt = stmt.where(models.ORMSession.session_type.in_(session_type))
        records = await self.session.scalars(stmt)
        return list(records.all())


@dataclass(kw_only=True)
class FileWithDetails:
    file: models.ORMFile
    state: models.ORMFileState | None
    tags: list[PersonalizedTag]
    permissions: list[models.ORMResourcePermission]
    authors: list[models.ORMAuthor]

    def get_effective_permission(self, user_id: UUID) -> RESOURCE_PERMISSIONS | None:
        direct = next((p for p in self.permissions if p.user_id == user_id), None)
        if direct:
            return direct.permission
        return None


class CollectionRepository(Repository):
    async def get_by_id_or_none(self, collection_id: UUID) -> models.ORMCollection | None:
        record = await self.session.get(models.ORMCollection, collection_id)
        return record

    async def get_by_id(self, collection_id: UUID):
        record = await self.session.get(models.ORMCollection, collection_id)
        if not record:
            raise CollectionNotFoundError(collection_id)
        return record

    async def get_by_name(self, collection_name: str) -> models.ORMCollection | None:
        record = await self.session.scalar(
            select(models.ORMCollection).where(func.lower(models.ORMCollection.name) == collection_name.lower())
        )
        return record

    async def list_by_ids(self, ids: list[UUID]) -> list[models.ORMCollection]:
        if not ids:
            return []
        stmt = select(models.ORMCollection).where(models.ORMCollection.id.in_(ids))
        return list(await self.session.scalars(stmt))

    def create(self, collection: models.ORMCollection) -> None:
        self.session.add(collection)

    async def delete(self, collection: models.ORMCollection) -> None:
        await self.session.delete(collection)


class AnnotationRepository(Repository):
    async def get_by_id(self, annotation_id: UUID):
        record = await self.session.get(models.ORMAnnotation, annotation_id)
        if not record:
            raise AnnotationNotFoundError(annotation_id)
        return record

    async def list_by_ids(self, ids: list[UUID]) -> dict[UUID, models.ORMAnnotation]:
        if not ids:
            return {}
        stmt = select(models.ORMAnnotation).where(models.ORMAnnotation.id.in_(ids))
        records = await self.session.scalars(stmt)
        return {c.id: c for c in records}

    async def list_by_file(self, file_id: UUID) -> list[models.ORMAnnotation]:
        stmt = select(models.ORMAnnotation).where(models.ORMAnnotation.file_id == file_id)
        return list(await self.session.scalars(stmt))

    async def list_by_label(self, label: str, file_ids: list[UUID] | None = None) -> dict[UUID, models.ORMAnnotation]:
        if not label:
            return {}

        stmt = select(models.ORMAnnotation).where(
            models.ORMAnnotation.label == label,
        )
        if file_ids is not None:
            stmt = stmt.where(models.ORMAnnotation.file_id.in_(file_ids))
        records = await self.session.scalars(stmt)
        return {c.id: c for c in records}

    async def list_distinct_labels(self, file_ids: list[UUID]) -> list[str]:
        if not file_ids:
            return []
        stmt = (
            select(models.ORMAnnotation.label)
            .where(
                models.ORMAnnotation.file_id.in_(file_ids),
                models.ORMAnnotation.label.is_not(None),
            )
            .distinct()
        )

        records = await self.session.execute(stmt)

        return [record[0] for record in records.all() if record[0] is not None]

    def save(self, record: models.ORMAnnotation) -> None:
        self.session.add(record)

    async def delete(self, record: models.ORMAnnotation) -> None:
        await self.session.delete(record)


class FileRepository(Repository):
    async def get_by_id(self, file_id: UUID):
        record = await self.session.get(models.ORMFile, file_id)
        if not record:
            raise LibraryFileNotFoundError(file_id)
        return record

    async def list_by_ids(self, ids: list[UUID]) -> dict[UUID, models.ORMFile]:
        if not ids:
            return {}
        stmt = select(models.ORMFile).where(models.ORMFile.id.in_(ids))
        records = await self.session.scalars(stmt)
        return {c.id: c for c in records}

    async def list_visible_to_user(
        self,
        user_id: UUID,
        collection_id: UUID | None = None,
        is_favorite: bool | None = None,
        tags: list[str] | None = None,
        authors: list[str] | None = None,
        name: str | None = None,
        description: str | None = None,
    ) -> list[models.ORMFile]:

        # Resources the user has ANY direct grant on (collections or files).
        granted = (
            select(models.ORMResourcePermission.resource_id)
            .where(models.ORMResourcePermission.user_id == user_id)
            .scalar_subquery()
        )

        # All collection IDs visible to the user (granted + descendants).
        visible = (
            select(models.ORMCollection.id)
            .where(models.ORMCollection.id.in_(granted))
            .cte("visible_collections", recursive=True)
        )
        visible = visible.union_all(
            select(models.ORMCollection.id).join(visible, models.ORMCollection.parent_id == visible.c.id)
        )

        # File is visible if its collection is visible OR the file itself is granted.
        stmt = select(models.ORMFile).where(
            or_(
                models.ORMFile.collection_id.in_(select(visible.c.id)),
                models.ORMFile.id.in_(granted),
            )
        )

        if collection_id is not None:
            stmt = stmt.where(models.ORMFile.collection_id == collection_id)

        if is_favorite is not None:
            favorited = exists().where(
                models.ORMFileState.file_id == models.ORMFile.id,
                models.ORMFileState.user_id == user_id,
                models.ORMFileState.is_favorite.is_(True),
            )
            stmt = stmt.where(favorited if is_favorite else ~favorited)

        if tags:
            for tag in tags:
                stmt = stmt.where(
                    exists().where(
                        models.ORMFileTag.file_id == models.ORMFile.id,
                        models.ORMFileTag.tag_id == models.ORMTag.id,
                        models.ORMTag.name == tag,
                    )
                )

        if authors:
            unique_authors = set(authors)
            for author in unique_authors:
                stmt = stmt.where(
                    exists().where(
                        models.ORMFileAuthor.file_id == models.ORMFile.id,
                        models.ORMFileAuthor.author_id == models.ORMAuthor.id,
                        models.ORMAuthor.name == author,
                    )
                )

        if name:
            stmt = stmt.where(models.ORMFile.name.ilike(f"%{name}%"))

        if description:
            stmt = stmt.where(models.ORMFile.description.ilike(f"%{description}%"))

        return list(await self.session.scalars(stmt))

    async def list_all_in_collection_tree(self, collection_id: UUID) -> list[models.ORMFile]:
        """
        Files in the given collection or any of its (nested) descendants.
        """
        descendants = (
            select(models.ORMCollection.id)
            .where(models.ORMCollection.id == collection_id)
            .cte(name="descendants", recursive=True)
        )
        descendants = descendants.union_all(
            select(models.ORMCollection.id).join(
                descendants,
                models.ORMCollection.parent_id == descendants.c.id,
            )
        )
        stmt = select(models.ORMFile).where(models.ORMFile.collection_id.in_(select(descendants.c.id)))
        return list(await self.session.scalars(stmt))

    async def list_owned_by(self, user_id: UUID) -> list[models.ORMFile]:
        stmt = (
            select(models.ORMFile)
            .join(
                models.ORMResourcePermission,
                models.ORMResourcePermission.resource_id == models.ORMFile.id,
            )
            .where(
                models.ORMResourcePermission.user_id == user_id,
                models.ORMResourcePermission.permission == "owner",
            )
        )
        return list(await self.session.scalars(stmt))

    def save(self, record: models.ORMFile | models.ORMFileState) -> None:
        self.session.add(record)

    async def delete(self, file: models.ORMFile) -> None:
        await self.session.delete(file)

    async def get_state_or_none(self, file_id: UUID, user_id: UUID) -> models.ORMFileState | None:
        return await self.session.scalar(
            select(models.ORMFileState).where(
                models.ORMFileState.user_id == user_id, models.ORMFileState.file_id == file_id
            )
        )

    async def list_states(self, file_ids: list[UUID], user_id: UUID):
        states = await self.session.scalars(
            select(models.ORMFileState).where(
                models.ORMFileState.user_id == user_id, models.ORMFileState.file_id.in_(set(file_ids))
            )
        )
        return list(states.all())


@dataclass
class PersonalizedTag:
    id: UUID  # Original tag ID
    name: str
    color: str = "gray"


@dataclass
class TagWithDetails(PersonalizedTag):
    file_count: int = 0


class TagRepository(Repository):
    async def get_by_id(self, tag_id: UUID):
        record = await self.session.get(models.ORMTag, tag_id)
        if not record:
            raise TagNotFoundError(tag_id)
        return record

    async def get_by_name(self, tag_name: str) -> models.ORMTag | None:
        record = await self.session.scalar(
            select(models.ORMTag).where(func.lower(models.ORMTag.name) == tag_name.lower())
        )
        return record

    def save(self, tag: models.ORMTag | models.ORMUserTagPreference) -> None:
        self.session.add(tag)

    async def delete(self, tag: models.ORMTag) -> None:
        await self.session.delete(tag)

    async def list_personalized_with_details(self, user_id: UUID) -> list[TagWithDetails]:
        granted = (
            select(models.ORMResourcePermission.resource_id)
            .where(models.ORMResourcePermission.user_id == user_id)
            .scalar_subquery()
        )

        visible = (
            select(models.ORMCollection.id)
            .where(models.ORMCollection.id.in_(granted))
            .cte("visible_collections", recursive=True)
        )
        visible = visible.union_all(
            select(models.ORMCollection.id).join(visible, models.ORMCollection.parent_id == visible.c.id)
        )

        visible_files = (
            select(models.ORMFile.id)
            .where(
                or_(
                    models.ORMFile.collection_id.in_(select(visible.c.id)),
                    models.ORMFile.id.in_(granted),
                )
            )
            .scalar_subquery()
        )

        stmt = (
            select(
                models.ORMTag,
                func.count(models.ORMFileTag.file_id).label("file_count"),
                models.ORMUserTagPreference.color,
            )
            .join(models.ORMFileTag, models.ORMTag.id == models.ORMFileTag.tag_id)
            .where(models.ORMFileTag.file_id.in_(visible_files))
            .outerjoin(
                models.ORMUserTagPreference,
                and_(
                    models.ORMUserTagPreference.tag_id == models.ORMTag.id,
                    models.ORMUserTagPreference.user_id == user_id,
                ),
            )
            .group_by(models.ORMTag.id, models.ORMUserTagPreference.color)
        )

        rows = await self.session.execute(stmt)

        return [
            TagWithDetails(
                id=tag.id,
                name=tag.name,
                color=color or "gray",
                file_count=count,
            )
            for tag, count, color in rows
        ]

    async def get_by_names(self, names: list[str]) -> list[models.ORMTag]:
        if not names:
            return []

        records = await self.session.scalars(
            select(models.ORMTag).where(func.lower(models.ORMTag.name).in_([n.lower() for n in names]))
        )
        return list(records.all())

    async def get_by_file(self, file_id: UUID) -> list[models.ORMTag]:
        stmt = (
            select(models.ORMTag)
            .join(models.ORMFileTag, models.ORMTag.id == models.ORMFileTag.tag_id)
            .where(models.ORMFileTag.file_id == file_id)
        )
        records = await self.session.scalars(stmt)
        return list(records.all())

    async def get_personalized_by_id_or_none(self, tag_id: UUID, user_id: UUID) -> models.ORMUserTagPreference | None:
        stmt = select(models.ORMUserTagPreference).where(
            models.ORMUserTagPreference.tag_id == tag_id, models.ORMUserTagPreference.user_id == user_id
        )
        return await self.session.scalar(stmt)

    async def list_personalized_by_files(
        self, file_ids: list[UUID], user_id: UUID
    ) -> dict[UUID, list[PersonalizedTag]]:
        if not file_ids:
            return {}

        stmt = (
            select(
                models.ORMFileTag.file_id,
                models.ORMTag.id,
                models.ORMTag.name,
                models.ORMUserTagPreference.color,
            )
            .join(models.ORMTag, models.ORMTag.id == models.ORMFileTag.tag_id)
            .outerjoin(
                models.ORMUserTagPreference,
                and_(
                    models.ORMUserTagPreference.tag_id == models.ORMTag.id,
                    models.ORMUserTagPreference.user_id == user_id,
                ),
            )
            .where(models.ORMFileTag.file_id.in_(file_ids))
        )

        rows = await self.session.execute(stmt)

        result: dict[UUID, list[PersonalizedTag]] = {}
        for file_id, tag_id, name, color in rows:
            result.setdefault(file_id, []).append(PersonalizedTag(id=tag_id, name=name, color=color or "gray"))
        return result

    async def replace_file_tags(self, file_id: UUID, tags: list[UUID] | list[models.ORMTag]):
        await self.session.execute(delete(models.ORMFileTag).where(models.ORMFileTag.file_id == file_id))

        for tag in tags:
            if isinstance(tag, models.ORMTag):
                tag = tag.id
            self.session.add(models.ORMFileTag(file_id=file_id, tag_id=tag))

    async def delete_orphaned(self):
        """
        Delete tags with no file assignments and no user preferences.
        """
        has_files = exists().where(models.ORMFileTag.tag_id == models.ORMTag.id)
        has_prefs = exists().where(models.ORMUserTagPreference.tag_id == models.ORMTag.id)

        stmt = delete(models.ORMTag).where(~has_files, ~has_prefs)
        await self.session.execute(stmt)


class AuthorRepository(Repository):
    def save(self, author: models.ORMAuthor) -> None:
        self.session.add(author)

    async def get_by_names(self, names: list[str]) -> list[models.ORMAuthor]:
        if not names:
            return []

        records = await self.session.scalars(
            select(models.ORMAuthor).where(func.lower(models.ORMAuthor.name).in_([n.lower() for n in names]))
        )
        return list(records.all())

    async def get_by_file(self, file_id: UUID) -> list[models.ORMAuthor]:
        stmt = (
            select(models.ORMAuthor)
            .join(models.ORMFileAuthor, models.ORMAuthor.id == models.ORMFileAuthor.author_id)
            .where(models.ORMFileAuthor.file_id == file_id)
        )
        records = await self.session.scalars(stmt)
        return list(records.all())

    async def list_by_files(self, file_ids: list[UUID]) -> dict[UUID, list[models.ORMAuthor]]:
        if not file_ids:
            return {}

        stmt = (
            select(models.ORMFileAuthor.file_id, models.ORMAuthor)
            .join(models.ORMAuthor, models.ORMAuthor.id == models.ORMFileAuthor.author_id)
            .where(models.ORMFileAuthor.file_id.in_(file_ids))
        )

        rows = await self.session.execute(stmt)

        result: dict[UUID, list[models.ORMAuthor]] = {}
        for file_id, author in rows:
            result.setdefault(file_id, []).append(author)
        return result

    async def replace_file_authors(self, file_id: UUID, authors: list[UUID] | list[models.ORMAuthor]):
        await self.session.execute(delete(models.ORMFileAuthor).where(models.ORMFileAuthor.file_id == file_id))

        for author in authors:
            if isinstance(author, models.ORMAuthor):
                author = author.id
            self.session.add(models.ORMFileAuthor(file_id=file_id, author_id=author))

    async def delete_orphaned(self):
        """
        Delete authors with no file assignments.
        """
        has_files = exists().where(models.ORMFileAuthor.author_id == models.ORMAuthor.id)

        stmt = delete(models.ORMAuthor).where(~has_files)
        await self.session.execute(stmt)

    async def list_distinct_by_files(self, file_ids: list[UUID]) -> list[models.ORMAuthor]:
        if not file_ids:
            return []

        stmt = (
            select(models.ORMAuthor)
            .join(models.ORMFileAuthor, models.ORMAuthor.id == models.ORMFileAuthor.author_id)
            .where(models.ORMFileAuthor.file_id.in_(file_ids))
            .distinct()
            .order_by(models.ORMAuthor.name)
        )
        records = await self.session.scalars(stmt)
        return list(records.all())


@dataclass
class PermissionAssignment:
    permission: models.ORMResourcePermission
    user: models.ORMUser
    inherited_from: UUID | None = None


class PermissionRepository(Repository):
    async def get_by_id_or_none(self, permission_id: UUID):
        return await self.session.get(models.ORMResourcePermission, permission_id)

    async def list_direct_grants_by_resource(
        self, resource_ids: list[UUID]
    ) -> dict[UUID, list[models.ORMResourcePermission]]:
        if not resource_ids:
            return {}
        stmt = select(models.ORMResourcePermission).where(models.ORMResourcePermission.resource_id.in_(resource_ids))
        rows = await self.session.scalars(stmt)

        result: dict[UUID, list[models.ORMResourcePermission]] = {}
        for permission in rows:
            result.setdefault(permission.resource_id, []).append(permission)
        return result

    async def list_for_collection(self, collection_id: UUID) -> list[PermissionAssignment]:
        """
        Everyone with access (direct + inherited). Closest grant wins per user.
        """
        anc = (
            select(
                models.ORMCollection.id,
                models.ORMCollection.parent_id,
                literal(0).label("depth"),
            )
            .where(models.ORMCollection.id == collection_id)
            .cte("anc", recursive=True)
        )
        anc = anc.union_all(
            select(
                models.ORMCollection.id,
                models.ORMCollection.parent_id,
                anc.c.depth + 1,
            ).join(anc, models.ORMCollection.id == anc.c.parent_id)
        )

        # Rank by ancestor depth. Only carry the keys we need to re-join.
        ranked = (
            select(
                models.ORMResourcePermission.user_id.label("user_id"),
                models.ORMResourcePermission.resource_id.label("resource_id"),
                anc.c.id.label("source_id"),
                func.row_number()
                .over(
                    partition_by=models.ORMResourcePermission.user_id,
                    order_by=anc.c.depth.asc(),
                )
                .label("rn"),
            )
            .join(anc, anc.c.id == models.ORMResourcePermission.resource_id)
            .subquery()
        )

        # Re-select ORM entities by joining the ranked subquery back to the tables.
        stmt = (
            select(
                models.ORMResourcePermission,
                models.ORMUser,
                ranked.c.source_id,
            )
            .join(
                ranked,
                and_(
                    ranked.c.user_id == models.ORMResourcePermission.user_id,
                    ranked.c.resource_id == models.ORMResourcePermission.resource_id,
                ),
            )
            .join(
                models.ORMUser,
                models.ORMUser.id == models.ORMResourcePermission.user_id,
            )
            .where(ranked.c.rn == 1)
        )

        rows = await self.session.execute(stmt)
        return [
            PermissionAssignment(
                permission=row[0],
                user=row[1],
                inherited_from=row.source_id if row.source_id != collection_id else None,
            )
            for row in rows
        ]

    async def grant(
        self,
        resource_id: UUID,
        user_id: UUID,
        permission: RESOURCE_PERMISSIONS,
    ):

        stmt = select(models.ORMResourcePermission).where(
            models.ORMResourcePermission.resource_id == resource_id,
            models.ORMResourcePermission.user_id == user_id,
        )
        existing = await self.session.scalar(stmt)

        if existing:
            existing.permission = permission
            return
        self.session.add(
            models.ORMResourcePermission(
                resource_id=resource_id,
                user_id=user_id,
                permission=permission,
            )
        )

    async def get_effective_for_collection(
        self, collection_id: UUID, user_id: UUID
    ) -> models.ORMResourcePermission | None:
        """
        Closest grant for user, walking from collection_id up to root.
        """
        anc = (
            select(
                models.ORMCollection.id,
                models.ORMCollection.parent_id,
                literal(0).label("depth"),
            )
            .where(models.ORMCollection.id == collection_id)
            .cte("anc", recursive=True)
        )
        anc = anc.union_all(
            select(
                models.ORMCollection.id,
                models.ORMCollection.parent_id,
                anc.c.depth + 1,
            ).join(anc, models.ORMCollection.id == anc.c.parent_id)
        )

        stmt = (
            select(models.ORMResourcePermission)
            .join(anc, anc.c.id == models.ORMResourcePermission.resource_id)
            .where(models.ORMResourcePermission.user_id == user_id)
            .order_by(anc.c.depth.asc())
            .limit(1)
        )
        return await self.session.scalar(stmt)

    async def get_effective_owner_for_collection(self, collection_id: UUID) -> models.ORMResourcePermission | None:
        """
        Closest user with 'owner' permission, walking up from the collection.
        None if no owner grant exists in the ancestor chain.
        """
        anc = (
            select(
                models.ORMCollection.id,
                models.ORMCollection.parent_id,
                literal(0).label("depth"),
            )
            .where(models.ORMCollection.id == collection_id)
            .cte("anc", recursive=True)
        )
        anc = anc.union_all(
            select(
                models.ORMCollection.id,
                models.ORMCollection.parent_id,
                anc.c.depth + 1,
            ).join(anc, models.ORMCollection.id == anc.c.parent_id)
        )

        stmt = (
            select(models.ORMResourcePermission)
            .join(anc, anc.c.id == models.ORMResourcePermission.resource_id)
            .where(models.ORMResourcePermission.permission == "owner")
            .order_by(anc.c.depth.asc())
            .limit(1)
        )
        return await self.session.scalar(stmt)

    async def list_accessible_collection_ids(
        self, user_id: UUID, permission: list[RESOURCE_PERMISSIONS] | None = None
    ) -> list[UUID]:
        """
        All collection IDs the user can access (anything they have a grant on, plus all descendants).
        """
        grant_filter = [models.ORMResourcePermission.user_id == user_id]
        if permission:
            grant_filter.append(models.ORMResourcePermission.permission.in_(permission))

        granted = select(models.ORMResourcePermission.resource_id).where(*grant_filter).scalar_subquery()

        accessible = (
            select(models.ORMCollection.id, models.ORMCollection.parent_id)
            .where(models.ORMCollection.id.in_(granted))
            .cte("accessible", recursive=True)
        )
        accessible = accessible.union_all(
            select(models.ORMCollection.id, models.ORMCollection.parent_id).join(
                accessible, models.ORMCollection.parent_id == accessible.c.id
            )
        )
        rows = await self.session.scalars(select(accessible.c.id))
        return list(set(rows))

    async def list_owners_for_collections(self, collection_ids: list[UUID]) -> dict[UUID, UUID]:
        """
        Closest 'owner' user_id per collection, walking each one's ancestor chain.
        Collections with no owner anywhere up the chain are omitted.
        """
        if not collection_ids:
            return {}

        anc = (
            select(
                models.ORMCollection.id.label("seed_id"),
                models.ORMCollection.id.label("anc_id"),
                models.ORMCollection.parent_id.label("parent_id"),
                literal(0).label("depth"),
            )
            .where(models.ORMCollection.id.in_(collection_ids))
            .cte("anc", recursive=True)
        )
        anc = anc.union_all(
            select(
                anc.c.seed_id,
                models.ORMCollection.id.label("anc_id"),
                models.ORMCollection.parent_id.label("parent_id"),
                (anc.c.depth + 1).label("depth"),
            ).join(anc, models.ORMCollection.id == anc.c.parent_id)
        )

        ranked = (
            select(
                anc.c.seed_id,
                models.ORMResourcePermission.user_id,
                func.row_number()
                .over(
                    partition_by=anc.c.seed_id,
                    order_by=anc.c.depth.asc(),
                )
                .label("rn"),
            )
            .join(anc, anc.c.anc_id == models.ORMResourcePermission.resource_id)
            .where(models.ORMResourcePermission.permission == "owner")
            .subquery()
        )

        stmt = select(ranked.c.seed_id, ranked.c.user_id).where(ranked.c.rn == 1)
        rows = await self.session.execute(stmt)
        return {seed_id: user_id for seed_id, user_id in rows}

    async def get_effective_for_file(self, file: models.ORMFile, user_id: UUID) -> models.ORMResourcePermission | None:
        """
        Closest grant for user, walking from file up to root.
        """
        direct = await self.session.scalar(
            select(models.ORMResourcePermission).where(
                models.ORMResourcePermission.resource_id == file.id,
                models.ORMResourcePermission.user_id == user_id,
            )
        )
        if direct:
            return direct
        if file.collection_id:
            return await self.get_effective_for_collection(file.collection_id, user_id)
        return None

    async def revoke(self, resource_id: UUID, user_id: UUID):
        await self.session.execute(
            delete(models.ORMResourcePermission).where(
                models.ORMResourcePermission.resource_id == resource_id,
                models.ORMResourcePermission.user_id == user_id,
            )
        )

    async def delete(self, permission: models.ORMResourcePermission) -> None:
        await self.session.delete(permission)
