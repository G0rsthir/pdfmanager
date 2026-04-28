from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path, Request

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    AuthProviderRepositoryDependency,
    IdentityServiceDependency,
    LibraryServiceDependency,
    RoleRepositoryDependency,
    UserRepositoryDependency,
)
from server.exceptions import FieldError, InvalidActionError
from server.routes._assemblers import build_oidc_provider_response
from server.schemas.identity import (
    AuthProviderOidcCreateRequest,
    AuthProviderOidcResponse,
    AuthProviderOidcUpdateRequest,
    AuthProviderResponse,
    RoleResponse,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
)
from server.schemas.security import AccessSessionContext, CredentialsReset

router = APIRouter(prefix="/identity")


@router.get(path="/roles", response_model=list[RoleResponse], operation_id="ListRoles")
async def list_roles(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_READ])],
    role_repo: RoleRepositoryDependency,
):
    return await role_repo.get_list()


@router.get(path="/users", response_model=list[UserResponse], operation_id="ListUsers")
async def list_users(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_READ])],
    user_repo: UserRepositoryDependency,
):
    return await user_repo.get_list()


@router.post(path="/users", operation_id="CreateUser")
async def create_user(
    data: UserCreateRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_WRITE])],
    identity_service: IdentityServiceDependency,
):

    try:
        return await identity_service.create_local_user(data=data)
    except InvalidActionError as e:
        if e.rule == "email_already_in_use":
            raise FieldError(field="email", msg="Email is already in use") from e
        raise


@router.put(path="/users/{id}", operation_id="UpdateUser")
async def update_user(
    user_id: Annotated[UUID, Path(alias="id")],
    data: UserUpdateRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_WRITE])],
    identity_service: IdentityServiceDependency,
):
    try:
        await identity_service.update_user(user_id=user_id, data=data)
    except InvalidActionError as e:
        if e.rule == "email_already_in_use":
            raise FieldError(field="email", msg="Email is already in use") from e
        if e.rule == "last_admin_account_disable_forbidden":
            raise InvalidActionError("You cannot disable the last admin account", rule=e.rule) from e
        raise


@router.post(path="/users/{id}/password", operation_id="ResetUserPassword")
async def reset_user_password(
    user_id: Annotated[UUID, Path(alias="id")],
    credentials: CredentialsReset,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_WRITE])],
    identity_service: IdentityServiceDependency,
):

    await identity_service.reset_user_password(
        user_id=user_id,
        password_confirm=credentials.password_confirm,
        password=credentials.password,
    )


@router.delete(path="/users/{id}", operation_id="DeleteUser")
async def delete_user(
    user_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_WRITE])],
    identity_service: IdentityServiceDependency,
    library_service: LibraryServiceDependency,
):

    await identity_service.delete_user(request_user_id=access_session.user_id, user_id=user_id)
    await library_service.delete_library(user_id)


# Currently, openapi-ts does not support discriminators
@router.get(path="/auth_providers", response_model=list[AuthProviderResponse], operation_id="ListAuthProviders")
async def list_providers(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_READ])],
    provider_repo: AuthProviderRepositoryDependency,
):
    return await provider_repo.get_list()


@router.get(
    path="/auth_providers/oidc", response_model=list[AuthProviderOidcResponse], operation_id="ListOidcAuthProviders"
)
async def list_oidc_providers(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_READ])],
    provider_repo: AuthProviderRepositoryDependency,
    request: Request,
):
    providers = await provider_repo.get_oidc_list()
    return [build_oidc_provider_response(provider=provider, request=request) for provider in providers]


@router.get(
    path="/auth_providers/oidc/{id}", response_model=AuthProviderOidcResponse, operation_id="GetOidcAuthProvider"
)
async def get_oidc_provider(
    provider_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_READ])],
    provider_repo: AuthProviderRepositoryDependency,
    request: Request,
):
    provider = await provider_repo.get_oidc_by_id(provider_id=provider_id)
    return build_oidc_provider_response(provider=provider, request=request)


@router.post(path="/auth_providers/oidc", operation_id="CreateOidcAuthProvider")
async def create_provider_oidc(
    data: AuthProviderOidcCreateRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_WRITE])],
    identity_service: IdentityServiceDependency,
):

    try:
        await identity_service.create_oidc_provider(data=data)
    except InvalidActionError as e:
        if e.rule == "provider_name_already_in_use":
            raise FieldError(field="name", msg="Auth provider name is already in use") from e
        raise


@router.put(path="/auth_providers/oidc/{id}", operation_id="UpdateOidcAuthProvider")
async def update_provider_oidc(
    provider_id: Annotated[UUID, Path(alias="id")],
    data: AuthProviderOidcUpdateRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_WRITE])],
    identity_service: IdentityServiceDependency,
):

    try:
        await identity_service.update_oidc_provider(provider_id=provider_id, data=data)
    except InvalidActionError as e:
        if e.rule == "provider_name_already_in_use":
            raise FieldError(field="name", msg="Auth provider name is already in use") from e
        raise


@router.delete(path="/auth_providers/oidc/{id}", operation_id="DeleteOidcAuthProvider")
async def delete_oidc_provider(
    provider_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.ADMIN_WRITE])],
    provider_repo: AuthProviderRepositoryDependency,
):

    provider = await provider_repo.get_oidc_by_id(provider_id=provider_id)
    await provider_repo.delete(provider)
