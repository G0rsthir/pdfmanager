from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import SecretStr

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    AuthProviderRepositoryDependency,
    AuthServiceDependency,
    RefreshSecurity,
    TokenServiceDependency,
    UserRepositoryDependency,
)
from server.exceptions import AuthenticationError, AuthProviderNotFoundError, OAuthError
from server.routes._responses import SSOErrorRedirectResponse
from server.schemas.auth import (
    AuthenticateOidcRequest,
    AuthenticatePasswordRequest,
    AuthResult,
    RefreshResult,
    RefreshSessionRequest,
)
from server.schemas.general import RevokeResponse
from server.schemas.identity import UserResponse, UserSessionResponse
from server.schemas.security import AccessSessionContext, AccessToken, RefreshSessionContext
from server.security.oidc import OidcClient

router = APIRouter(prefix="/auth")


@router.get(path="/session", response_model=UserSessionResponse, operation_id="GetCurrentSession")
async def get_current_session(
    auth_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    user_repo: UserRepositoryDependency,
):
    """
    Get information about the current user session.
    """
    user_record = await user_repo.get_by_id(user_id=auth_session.user_id)

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


@router.delete(path="/token", response_model=RevokeResponse, operation_id="RevokeToken")
async def revoke_token(
    response: Response,
    refresh_session: Annotated[RefreshSessionContext, RefreshSecurity(scopes=[ScopesEnum.TOKEN_REFRESH])],
    token_service: TokenServiceDependency,
    auth_service: AuthServiceDependency,
    provider_repo: AuthProviderRepositoryDependency,
):
    """
    Invalidate the access and refresh tokens
    """

    await auth_service.revoke_session(refresh_session.session_id)

    response.delete_cookie(token_service.refresh_cookie_name, samesite="strict", path=token_service.token_url)

    try:
        provider = await provider_repo.get_oidc_by_id(refresh_session.auth_provider_id)
    except AuthProviderNotFoundError:
        return RevokeResponse()

    oidc_client = OidcClient(config=provider)

    end_session_endpoint = await oidc_client.get_end_session_endpoint()

    if not end_session_endpoint:
        return RevokeResponse()

    # Future: end_session_endpoint url should also include - id_token_hint
    return RevokeResponse(redirect_url=end_session_endpoint)


@router.get("/oidc/{id}", operation_id="OidcLogin")
async def oidc_authorize(
    provider_id: Annotated[UUID, Path(alias="id")],
    request: Request,
    provider_repo: AuthProviderRepositoryDependency,
):

    try:
        provider = await provider_repo.get_oidc_by_id(provider_id)

        if not provider.can_authenticate():
            raise AuthenticationError("Auth provider is disabled or does not support authentication")

        oidc_client = OidcClient(config=provider)

        redirect_url = str(request.url_for("oidc_callback", id=provider_id))

        return await oidc_client.authorize_redirect(request, redirect_url=redirect_url)
    except AuthenticationError as e:
        return SSOErrorRedirectResponse(description=str(e), error_code=400)
    except Exception:
        return SSOErrorRedirectResponse()


@router.get("/oidc/{id}/callback", response_class=RedirectResponse, operation_id="OidcCallback")
async def oidc_callback(
    provider_id: Annotated[UUID, Path(alias="id")],
    request: Request,
    token_service: TokenServiceDependency,
    auth_service: AuthServiceDependency,
    provider_repo: AuthProviderRepositoryDependency,
):
    try:
        provider = await provider_repo.get_oidc_by_id(provider_id)

        if not provider.can_authenticate():
            raise AuthenticationError("Auth provider is disabled or does not support authentication")

        oidc_client = OidcClient(config=provider)

        oidc_result = await oidc_client.authorize_access_token(request)

        result: AuthResult = await auth_service.authenticate_with_oidc(
            AuthenticateOidcRequest(
                email=oidc_result.user.email,
                auth_provider_id=provider.id,
                groups=oidc_result.user.groups,
                name=oidc_result.user.name,
            )
        )

        response = RedirectResponse("/")

        cookie = token_service.issue_refresh_cookie(
            user_id=result.user_id,
            session_id=result.session_id,
            auth_provider_id=result.auth_provider_id,
            expires=result.session_expires_delta,
        )
        response.set_cookie(**cookie.model_dump())
        return response

    except (OAuthError, AuthenticationError) as e:
        return SSOErrorRedirectResponse(description=str(e), error_code=400)
    except Exception:
        return SSOErrorRedirectResponse()
