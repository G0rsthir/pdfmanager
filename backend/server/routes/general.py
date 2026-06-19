from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path, Request
from fastapi.responses import JSONResponse

from server.const import AccessScopeEnum
from server.dependencies import (
    AccessSecurity,
    ApiKeyServiceDependency,
    TokenServiceDependency,
    UserRepositoryDependency,
)
from server.routes._assemblers import build_api_key_response
from server.schemas.security import (
    AccessSessionContext,
    ApiKeyCreateRequest,
    ApiKeyCreateResultResponse,
    ApiKeyResetRequest,
    ApiKeyResponse,
)

router = APIRouter(prefix="/general")


@router.get(path="/api/docs", operation_id="GetApiDocs")
async def get_api_docs(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.ADMIN_READ])],
    request: Request,
):
    """
    Get API documentation in OpenAPI format.
    """

    return JSONResponse(request.app.openapi())


@router.get(path="/api/keys", response_model=list[ApiKeyResponse], operation_id="ListApiKeys")
async def list_api_keys(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.ADMIN_READ])],
    api_key_service: ApiKeyServiceDependency,
    user_repo: UserRepositoryDependency,
):
    keys = await api_key_service.list_all()
    users = await user_repo.list_by_ids([k.user_id for k in keys])

    return [build_api_key_response(k, users.get(k.user_id)) for k in keys]


@router.post(path="/api/keys", response_model=ApiKeyCreateResultResponse, operation_id="CreateApiKey")
async def create_api_key(
    data: ApiKeyCreateRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.ADMIN_WRITE])],
    token_service: TokenServiceDependency,
    api_key_service: ApiKeyServiceDependency,
):

    result = await api_key_service.create_api_key(
        user_id=data.user_id, description=data.description, expires_at=data.expires_at, scopes=data.scopes
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


@router.delete(path="/api/keys/{id}", operation_id="RevokeApiKey")
async def revoke_api_key(
    item_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.ADMIN_WRITE])],
    api_key_service: ApiKeyServiceDependency,
):
    await api_key_service.revoke_api_key(item_id)


@router.post(path="/api/keys/{id}/reset", response_model=ApiKeyCreateResultResponse, operation_id="ResetApiKey")
async def reset_api_key(
    item_id: Annotated[UUID, Path(alias="id")],
    data: ApiKeyResetRequest,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScopeEnum.ADMIN_WRITE])],
    token_service: TokenServiceDependency,
    api_key_service: ApiKeyServiceDependency,
):

    result = await api_key_service.reset_api_key(key_id=item_id, expires_at=data.expires_at)

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
