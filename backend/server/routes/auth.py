from typing import Annotated

from fastapi import APIRouter, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import SecretStr

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    AuthServiceDependency,
    RefreshSecurity,
    TokenServiceDependency,
    UserRepositoryDependency,
)
from server.schemas.auth import AuthenticatePasswordRequest, AuthResult, RefreshResult, RefreshSessionRequest
from server.schemas.identity import UserResponse, UserSessionResponse
from server.schemas.security import AccessSessionContext, AccessToken, RefreshSessionContext

router = APIRouter(prefix="/auth")


@router.get(path="/session", response_model=UserSessionResponse, operation_id="GetCurrentSession")
async def get_current_session(
    auth_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    user_repo: UserRepositoryDependency,
):
    """
    Get information about the current user session.
    """
    user_record = await user_repo.get_required(user_id=auth_session.user_id)

    user_data = UserResponse.model_validate(user_record)

    return UserSessionResponse(
        user_id=auth_session.user_id,
        user=user_data,
        session_id=auth_session.session_id,
    )


@router.post(path="/token", response_model=AccessToken, operation_id="CreateAuthToken")
async def authenticate_with_password(
    response: Response,
    data: Annotated[OAuth2PasswordRequestForm, Depends()],
    token_service: TokenServiceDependency,
    auth_service: AuthServiceDependency,
) -> AccessToken:
    """
    Create access and refresh tokens using Basic Auth.
    """

    result: AuthResult = await auth_service.authenticate_with_local_password(
        AuthenticatePasswordRequest(
            email=data.username,
            password=SecretStr(data.password),
        )
    )

    access_token = token_service.issue_access_token(
        user_id=result.user_id,
        session_id=result.session_id,
        auth_provider_id=result.auth_provider_id,
        role_id=result.role_id,
        expires=result.session_revalidate_delta,
        scopes=result.scopes,
    )

    cookie = token_service.issue_refresh_cookie(
        user_id=result.user_id,
        session_id=result.session_id,
        auth_provider_id=result.auth_provider_id,
        expires=result.session_expires_delta,
    )
    response.set_cookie(**cookie.model_dump())

    return AccessToken(
        access_token=access_token,
        token_type="bearer",
        expires=result.session_revalidate_at,
    )


@router.post("/refresh", response_model=AccessToken, operation_id="RefreshAuthToken")
async def refresh_token(
    response: Response,
    refresh_session: Annotated[RefreshSessionContext, RefreshSecurity(scopes=[ScopesEnum.TOKEN_REFRESH])],
    token_service: TokenServiceDependency,
    auth_service: AuthServiceDependency,
):
    """
    Receive a new access token using the refresh token.
    """
    result: RefreshResult = await auth_service.refresh_session(
        RefreshSessionRequest(user_id=refresh_session.user_id, session_id=refresh_session.session_id)
    )

    access_token = token_service.issue_access_token(
        user_id=result.user_id,
        session_id=result.session_id,
        auth_provider_id=result.auth_provider_id,
        role_id=result.role_id,
        expires=result.session_revalidate_delta,
        scopes=result.scopes,
    )

    if result.is_rotated:
        cookie = token_service.issue_refresh_cookie(
            user_id=result.user_id,
            session_id=result.session_id,
            auth_provider_id=result.auth_provider_id,
            expires=result.session_expires_delta,
        )
        response.set_cookie(**cookie.model_dump())

    return AccessToken(
        access_token=access_token,
        token_type="bearer",
        expires=result.session_revalidate_at,
    )


@router.delete(path="/token", operation_id="RevokeToken")
async def revoke_token(
    response: Response,
    refresh_session: Annotated[RefreshSessionContext, RefreshSecurity(scopes=[ScopesEnum.TOKEN_REFRESH])],
    token_service: TokenServiceDependency,
    auth_service: AuthServiceDependency,
):
    """
    Invalidate the access and refresh tokens
    """

    await auth_service.revoke_session(refresh_session.session_id)

    response.delete_cookie(token_service.refresh_cookie_name, samesite="strict", path=token_service.token_url)
