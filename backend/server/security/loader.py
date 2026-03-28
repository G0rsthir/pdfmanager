from logging import getLogger
from typing import Any

from pydantic import ValidationError

from server.schemas.security import AccessSessionContext, RefreshSessionContext

from .manager import AuthManager

logger = getLogger(__name__)


async def load_access_context(context_info: dict[str, Any]) -> AccessSessionContext | None:
    try:
        session = AccessSessionContext.model_validate(context_info)
    except ValidationError as e:
        logger.debug("Failed to validate access session context", exc_info=e)
        return

    return session


async def load_refresh_context(context_info: dict[str, Any]) -> RefreshSessionContext | None:
    try:
        session = RefreshSessionContext.model_validate(context_info)
    except ValidationError as e:
        logger.debug("Failed to validate refresh session context", exc_info=e)
        return

    return session


AUTH_URL = "/api/v1/auth"
AUTH_TOKEN_URL = AUTH_URL + "/token"


def create_auth_managers(access_jwt_secret: str, refresh_jwt_secret: str):
    access_manager = AuthManager(
        secret=access_jwt_secret,
        token_url=AUTH_TOKEN_URL,
        use_cookie=False,
        context_callback=load_access_context,
        use_header=True,
    )

    refresh_manager = AuthManager(
        secret=refresh_jwt_secret,
        token_url=AUTH_TOKEN_URL,
        use_cookie=True,
        use_header=False,
        context_callback=load_refresh_context,
    )

    return access_manager, refresh_manager
