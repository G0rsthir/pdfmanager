from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path

from server.const import AccessScopeEnum
from server.dependencies import (
    AccessSecurity,
    ApiKeyServiceDependency,
    AuthServiceDependency,
    IdentityServiceDependency,
    TokenServiceDependency,
)
from server.exceptions import FieldError, ForbiddenActionError, InvalidActionError
from server.routes._assemblers import build_api_key_response
from server.schemas.account import DetailsUpdate
from server.schemas.security import (
    AccessSessionContext,
    ApiKeyCreateResultResponse,
    ApiKeyPersonalCreate,
    ApiKeyResetRequest,
    ApiKeyResponse,
    CredentialsUpdate,
)

router = APIRouter(prefix="/account")


@router.put(path="/details", operation_id="UpdateUserAccountDetails")
async def update_details(
    details_update: DetailsUpdate,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.USER_WRITE])],
    identity_service: IdentityServiceDependency,
):
    """
    Update current user's details.
    """
    try:
        await identity_service.patch_local_user_details(
            user_id=access_session.user_id,
            name=details_update.name,
            email=details_update.email,
        )
    except InvalidActionError as e:
        if e.rule == "email_already_in_use":
            raise FieldError(field="email", msg="Email is already in use") from e
        raise


@router.put(path="/password", operation_id="UpdateUserPassword")
async def update_password(
    credentials: CredentialsUpdate,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.USER_WRITE])],
    identity_service: IdentityServiceDependency,
):
    """
    Update current user's password.
    """
    try:
        await identity_service.change_user_password(
            user_id=access_session.user_id,
            password_confirm=credentials.password_confirm,
            password_new=credentials.password_new,
            password_old=credentials.password_old,
        )
    except InvalidActionError as e:
        if e.rule == "invalid_old_password":
            raise FieldError(field="password_old", msg=e.msg) from e
        raise


@router.get(path="/keys", response_model=list[ApiKeyResponse], operation_id="ListPersonalApiKeys")
async def list_api_keys(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.USER_READ])],
    api_key_service: ApiKeyServiceDependency,
):
    keys = await api_key_service.list_all_by_user(user_id=access_session.user_id)

    return [build_api_key_response(k) for k in keys]


@router.post(path="/keys", response_model=ApiKeyCreateResultResponse, operation_id="CreatePersonalApiKey")
async def create_api_key(
    data: ApiKeyPersonalCreate,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.USER_WRITE])],
    api_key_service: ApiKeyServiceDependency,
    token_service: TokenServiceDependency,
    auth_service: AuthServiceDependency,
):

    session = await auth_service.get_session(access_session.session_id)
    if session.is_service:
        raise ForbiddenActionError("API key cannot be used to create another API key")

    try:
        result = await api_key_service.create_personal_api_key(
            user_id=access_session.user_id,
            expires_at=data.expires_at,
            description=data.description,
            scopes=data.scopes,
        )
    except InvalidActionError as e:
        if e.rule == "scope_not_granted_to_user":
            raise FieldError(
                field="scopes", msg=f"An API key cannot be granted scopes the user does not already have. {e}"
            ) from e
        raise

    access_token = token_service.issue_access_token(
        user_id=result.user_id,
        session_id=result.session_id,
        expires_at=result.session_expires_at,
        scopes=result.scopes,
    )

    return ApiKeyCreateResultResponse(
        token=access_token,
        expires_at=result.session_expires_at,
        user_id=result.user_id,
    )


@router.delete(path="/keys/{id}", operation_id="RevokePersonalApiKey")
async def revoke_api_key(
    item_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.USER_WRITE])],
    api_key_service: ApiKeyServiceDependency,
):

    await api_key_service.revoke_personal_api_key(user_id=access_session.user_id, api_key_id=item_id)


@router.post(path="/keys/{id}/reset", response_model=ApiKeyCreateResultResponse, operation_id="ResetPersonalApiKey")
async def reset_api_key(
    item_id: Annotated[UUID, Path(alias="id")],
    data: ApiKeyResetRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.USER_WRITE])],
    token_service: TokenServiceDependency,
    api_key_service: ApiKeyServiceDependency,
):

    result = await api_key_service.reset_personal_api_key(
        user_id=access_session.user_id, key_id=item_id, expires_at=data.expires_at
    )

    access_token = token_service.issue_access_token(
        user_id=result.user_id,
        session_id=result.session_id,
        expires_at=result.session_expires_at,
        scopes=result.scopes,
    )

    return ApiKeyCreateResultResponse(
        token=access_token,
        expires_at=result.session_expires_at,
        user_id=result.user_id,
    )
