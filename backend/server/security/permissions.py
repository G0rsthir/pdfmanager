from datetime import timedelta
from uuid import UUID

from server.infrastructure.cache import Cache
from server.infrastructure.database.interface import SessionFactory
from server.models import ORMSession, ORMUserRole
from server.repositories import RoleRepository, SessionRepository
from server.schemas.security import AccessSessionContext
from server.schemas.types import Scopes


class PermissionResolver:
    def __init__(self, session_factory: SessionFactory):
        self._session_factory = session_factory
        self._cache = Cache

    async def get_session(self, session_id: UUID) -> ORMSession | None:
        session = self._cache.get(category="permission_sessions", key=str(session_id))
        if session:
            return session
        async with self._session_factory() as db_session:
            session_repo = SessionRepository(db_session)
            session = await session_repo.get_by_id_or_none(session_id)
            self._cache.set(
                category="permission_sessions", key=str(session_id), value=session, ttl=timedelta(minutes=1)
            )
            return session

    async def get_role(self, user_id: UUID) -> ORMUserRole | None:
        role = self._cache.get(category="permission_role", key=str(user_id))
        if role:
            return role
        async with self._session_factory() as db_session:
            role_repo = RoleRepository(db_session)
            role = await role_repo.get_by_user_id(user_id)
            self._cache.set(category="permission_role", key=str(user_id), value=role, ttl=timedelta(minutes=1))
            return role

    async def has_scope(self, context: AccessSessionContext, scopes: list[str] | None) -> bool:
        session = await self.get_session(context.session_id)
        if not session or not session.is_valid:
            return False
        if scopes is None:
            return True

        # Service session validation
        if session.scopes is not None:
            session_scopes = Scopes.from_str(session.scopes).to_list()
            return all(s in session_scopes for s in scopes)

        # Interactive session validation
        role = await self.get_role(context.user_id)
        if not role:
            return False

        role_scopes = Scopes.from_str(role.scopes).to_list()
        return all(s in role_scopes for s in scopes)
