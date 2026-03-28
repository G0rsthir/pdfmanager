from datetime import timedelta

from fastapi.encoders import jsonable_encoder

from server.const import ScopesEnum
from server.schemas.security import AccessSessionContext, Cookie, RefreshSessionContext
from server.security.loader import AUTH_URL
from server.security.manager import AuthManager


def create_access_token(
    access_manager: AuthManager,
    data: AccessSessionContext,
    expires: timedelta = timedelta(minutes=5),
) -> str:
    """
    Create an access token for the user.
    """
    return access_manager.create_access_token(
        data=jsonable_encoder(data.model_dump(exclude_none=True, exclude_defaults=True)),
        expires=expires,
    )


def create_refresh_token(
    refresh_manager: AuthManager, data: RefreshSessionContext, expires: timedelta = timedelta(minutes=60)
) -> str:
    """
    Create a refresh token for the user.
    """

    return refresh_manager.create_access_token(
        data=jsonable_encoder(data.model_dump(exclude_none=True, exclude_defaults=True)),
        expires=expires,
        scopes=[ScopesEnum.TOKEN_REFRESH],
    )


def create_refresh_cookie(
    cookie_name: str,
    token: str,
    expires: timedelta = timedelta(minutes=60),
) -> Cookie:
    """
    Create a refresh cookie for the user.
    """
    return Cookie(
        key=cookie_name,
        value=token,
        httponly=True,
        samesite="strict",
        path=AUTH_URL,
        expires=int(expires.total_seconds()),
    )


def normalize_scopes(scopes: list[str]) -> str:
    _scopes = set(scopes)
    return " ".join(_scopes)
