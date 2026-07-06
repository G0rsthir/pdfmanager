from datetime import datetime
from uuid import UUID

from server.const import SessionTypeEnum
from server.exceptions import AuthenticationError
from server.models import ORMSession
from server.repositories import SessionRepository, UserRepository
from server.schemas.security import ApiKeyCreateResult
from server.schemas.types import Scopes


class ApiKeyService:
    def __init__(
        self,
        user_repo: UserRepository,
        session_repo: SessionRepository,
    ):
        self._user_repo = user_repo
        self._session_repo = session_repo

    async def list_all(self) -> list[ORMSession]:
        return await self._session_repo.get_list(session_type=[SessionTypeEnum.SERVICE])

    async def create_api_key(
        self, user_id: UUID, description: str, expires_at: datetime, scopes: Scopes
    ) -> ApiKeyCreateResult:
        """
        Creates a long-lived API key for a user
        """
        user = await self._user_repo.get_by_id(user_id)

        if not user.can_authenticate():
            raise AuthenticationError("User account is disabled or does not support authentication")

        auth_token = ORMSession.build_service(
            user_id=user.id,
            expires_at=expires_at,
            auth_provider_id=user.auth_provider_id,
            description=description,
            scopes=scopes,
        )

        self._session_repo.create(auth_token)
        await self._session_repo.commit()

        return ApiKeyCreateResult(
            session_id=auth_token.id,
            user_id=user.id,
            scopes=scopes,
            auth_provider_id=user.auth_provider_id,
            session_expires_at=expires_at,
            created_at=auth_token.created_at,
        )

    async def revoke_api_key(self, api_key_id: UUID):

        api_key = await self._session_repo.get_by_id(api_key_id)

        if not api_key.is_expired and not api_key.is_revoked:
            api_key.revoke()
            await self._session_repo.commit()

    async def reset_api_key(
        self,
        key_id: UUID,
        expires_at: datetime,
    ) -> ApiKeyCreateResult:
        """
        Resets an API key by revoking the existing key and creating a new one with the same permissions.
        """
        token = await self._session_repo.get_by_id(key_id)

        user = await self._user_repo.get_by_id(token.user_id)

        if not user.can_authenticate():
            raise AuthenticationError("Cannot reset an API key for an disabled user")

        if not token.is_service:
            raise AuthenticationError("Cannot reset a non-service API key")

        if token.is_revoked:
            raise AuthenticationError("Cannot reset a revoked API key")

        if token.scopes is None:
            raise ValueError("Cannot reset an API key with no scopes")

        scopes = Scopes.from_str(token.scopes)

        # Create a new long-lived token
        auth_token = ORMSession.build_service(
            user_id=user.id,
            expires_at=expires_at,
            auth_provider_id=user.auth_provider_id,
            description=token.description,
            scopes=scopes,
        )

        self._session_repo.create(auth_token)

        if not token.is_revoked:
            token.revoke()

        await self._session_repo.commit()

        return ApiKeyCreateResult(
            session_id=auth_token.id,
            user_id=user.id,
            scopes=scopes,
            auth_provider_id=user.auth_provider_id,
            session_expires_at=expires_at,
            created_at=auth_token.created_at,
        )
