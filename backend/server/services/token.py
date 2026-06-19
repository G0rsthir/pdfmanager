from datetime import datetime
from uuid import UUID

from fastapi.encoders import jsonable_encoder

from server.const import RefreshScopeEnum
from server.schemas.security import AccessSessionContext, Cookie, RefreshSessionContext
from server.schemas.types import Scopes
from server.security.loader import AUTH_URL
from server.security.manager import AuthManager


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
        expires_at: datetime,
        scopes: Scopes | None = None,
    ) -> str:

        access_ctx = AccessSessionContext(
            user_id=user_id,
            session_id=session_id,
            scopes=scopes,
        )

        return self.access_manager.create_access_token(
            data=jsonable_encoder(access_ctx.model_dump(exclude_none=True, exclude_defaults=True)),
            expires_at=expires_at,
        )

    def issue_refresh_token(self, user_id: UUID, session_id: UUID, expires_at: datetime) -> str:

        scopes = Scopes([RefreshScopeEnum.TOKEN_REFRESH])

        refresh_ctx = RefreshSessionContext(user_id=user_id, session_id=session_id, scopes=scopes)

        return self.refresh_manager.create_access_token(
            data=jsonable_encoder(refresh_ctx.model_dump(exclude_none=True, exclude_defaults=True)),
            expires_at=expires_at,
        )

    def issue_refresh_cookie(self, user_id: UUID, session_id: UUID, expires_at: datetime) -> Cookie:

        token = self.issue_refresh_token(user_id=user_id, session_id=session_id, expires_at=expires_at)

        return Cookie(
            key=self.refresh_cookie_name,
            value=token,
            httponly=True,
            samesite="strict",
            path=AUTH_URL,
            expires=expires_at,
        )
