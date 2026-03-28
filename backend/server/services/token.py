from datetime import timedelta
from uuid import UUID

from server.schemas.security import AccessSessionContext, Cookie, RefreshSessionContext
from server.security.manager import AuthManager
from server.security.tokens import create_access_token, create_refresh_cookie, create_refresh_token


class TokenResponseService:
    def __init__(
        self,
        access_manager: AuthManager,
        refresh_manager: AuthManager,
    ):
        self.access_manager = access_manager
        self.refresh_manager = refresh_manager
        self.refresh_cookie_name = refresh_manager.cookie_name
        self.token_url = refresh_manager.token_url

    def issue_access_token(
        self,
        user_id: UUID,
        session_id: UUID,
        auth_provider_id: UUID,
        role_id: UUID,
        expires: timedelta,
        scopes: list[str],
    ) -> str:

        access_ctx = AccessSessionContext(
            user_id=user_id, session_id=session_id, auth_provider_id=auth_provider_id, role_id=role_id, scopes=scopes
        )

        return create_access_token(access_manager=self.access_manager, data=access_ctx, expires=expires)

    def issue_refresh_token(self, user_id: UUID, session_id: UUID, auth_provider_id: UUID, expires: timedelta) -> str:

        refresh_ctx = RefreshSessionContext(user_id=user_id, session_id=session_id, auth_provider_id=auth_provider_id)

        return create_refresh_token(refresh_manager=self.refresh_manager, data=refresh_ctx, expires=expires)

    def issue_refresh_cookie(
        self, user_id: UUID, session_id: UUID, auth_provider_id: UUID, expires: timedelta
    ) -> Cookie:

        token = self.issue_refresh_token(
            user_id=user_id, session_id=session_id, auth_provider_id=auth_provider_id, expires=expires
        )

        return create_refresh_cookie(cookie_name=self.refresh_cookie_name, token=token, expires=expires)
