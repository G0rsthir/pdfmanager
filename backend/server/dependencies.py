from __future__ import annotations

from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Request, Security
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from sqlalchemy.ext.asyncio import AsyncSession

from server.const import ScopesEnum
from server.infrastructure.search import Fts5SearchBackend, SearchBackend
from server.infrastructure.storage import LocalStorageBackend
from server.repositories import (
    AuthProviderRepository,
    CollectionRepository,
    FileRepository,
    PermissionRepository,
    RoleRepository,
    SessionRepository,
    TagRepository,
    UserRepository,
)
from server.runtime import RuntimeContainer
from server.security.loader import AUTH_TOKEN_URL
from server.services.auth import AuthService
from server.services.identity import IdentityService
from server.services.indexing import IndexingService
from server.services.library import LibraryService
from server.services.token import TokenResponseService

from .schemas.security import AccessSessionContext, RefreshSessionContext
from .security.manager import AuthManager
from .settings import AppEnvSettings


class AccessManagerDependency(OAuth2PasswordBearer):
    def __init__(self):
        super().__init__(tokenUrl=AUTH_TOKEN_URL, auto_error=False)
        self.permissions = {}

    async def __call__(self, request: Request, scopes: SecurityScopes) -> AccessSessionContext:
        manager: AuthManager[AccessSessionContext] = request.app.state.access_manager
        return await manager(request=request, security_scopes=scopes)


class RefreshManagerDependency(OAuth2PasswordBearer):
    def __init__(self):
        super().__init__(tokenUrl=AUTH_TOKEN_URL, auto_error=False)

    async def __call__(self, request: Request, scopes: SecurityScopes) -> RefreshSessionContext:
        manager: AuthManager[RefreshSessionContext] = request.app.state.refresh_manager
        return await manager(request=request, security_scopes=scopes)


_access_manager_dependency = AccessManagerDependency()

_refresh_manager_dependency = RefreshManagerDependency()


def AccessSecurity(*, scopes: list[ScopesEnum] | None = None):
    return Security(_access_manager_dependency, scopes=scopes)


def RefreshSecurity(*, scopes: list[ScopesEnum] | None = None):
    return Security(_refresh_manager_dependency, scopes=scopes)


def get_token_service(request: Request) -> TokenResponseService:
    return TokenResponseService(
        access_manager=request.app.state.access_manager,
        refresh_manager=request.app.state.refresh_manager,
    )


def get_auth_service(
    user_repo: UserRepositoryDependency,
    auth_provider_repo: AuthProviderRepositoryDependency,
    session_repo: SessionRepositoryDependency,
    request: Request,
    role_repo: RoleRepositoryDependency,
) -> AuthService:
    return AuthService(
        user_repo=user_repo,
        role_repo=role_repo,
        provider_repo=auth_provider_repo,
        session_repo=session_repo,
        env=request.app.state.env,
    )


def get_identity_service(
    user_repo: UserRepositoryDependency,
    auth_provider_repo: AuthProviderRepositoryDependency,
    role_repo: RoleRepositoryDependency,
) -> IdentityService:
    return IdentityService(
        user_repo=user_repo,
        role_repo=role_repo,
        provider_repo=auth_provider_repo,
    )


def get_library_service(
    request: Request,
    collection_repo: CollectionRepositoryDependency,
    file_repo: FileRepositoryDependency,
    tags_repo: TagRepositoryDependency,
    search_engine: SearchEngineDependency,
    permission_repo: PermissionDependency,
) -> LibraryService:
    env: AppEnvSettings = request.app.state.env
    backend = LocalStorageBackend(env.STORAGE_DIR)

    return LibraryService(
        collection_repo=collection_repo,
        file_repo=file_repo,
        tags_repo=tags_repo,
        search_engine=search_engine,
        permission_repo=permission_repo,
        storage_backend=backend,
    )


def get_search_engine(
    db: DBSessionDependency,
) -> SearchBackend:
    return Fts5SearchBackend(session=db)


async def run_with_indexing_service(context: RuntimeContainer, callback: Callable[[IndexingService], Awaitable[None]]):
    """
    Stand-alone service
    """
    async with context.db.get_session_context() as session:
        service = IndexingService(
            storage_backend=LocalStorageBackend(context.env.STORAGE_DIR),
            search_engine=get_search_engine(session),
        )
        await callback(service)


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession]:
    context: RuntimeContainer = request.app.state.app_context
    async with context.db.get_session_context() as session:
        yield session


def get_env_settings(request: Request) -> AppEnvSettings:
    return request.app.state.env


def get_user_repository(
    db: DBSessionDependency,
) -> UserRepository:
    return UserRepository(db)


def get_permission_repository(
    db: DBSessionDependency,
) -> PermissionRepository:
    return PermissionRepository(db)


def get_tag_repository(
    db: DBSessionDependency,
) -> TagRepository:
    return TagRepository(db)


def get_file_repository(
    db: DBSessionDependency,
) -> FileRepository:
    return FileRepository(db)


def get_role_repository(
    db: DBSessionDependency,
) -> RoleRepository:
    return RoleRepository(db)


def get_session_repository(
    db: DBSessionDependency,
) -> SessionRepository:
    return SessionRepository(db)


def get_auth_provider_repository(
    db: DBSessionDependency,
) -> AuthProviderRepository:
    return AuthProviderRepository(db)


def get_collection_repository(
    db: DBSessionDependency,
) -> CollectionRepository:
    return CollectionRepository(db)


DBSessionDependency = Annotated[AsyncSession, Depends(get_db_session)]
EnvSettingsDependency = Annotated[AppEnvSettings, Depends(get_env_settings)]
TokenServiceDependency = Annotated[TokenResponseService, Depends(get_token_service)]
TagRepositoryDependency = Annotated[TagRepository, Depends(get_tag_repository)]
RoleRepositoryDependency = Annotated[RoleRepository, Depends(get_role_repository)]
FileRepositoryDependency = Annotated[FileRepository, Depends(get_file_repository)]
CollectionRepositoryDependency = Annotated[CollectionRepository, Depends(get_collection_repository)]
UserRepositoryDependency = Annotated[UserRepository, Depends(get_user_repository)]
SessionRepositoryDependency = Annotated[SessionRepository, Depends(get_session_repository)]
AuthProviderRepositoryDependency = Annotated[AuthProviderRepository, Depends(get_auth_provider_repository)]
PermissionDependency = Annotated[PermissionRepository, Depends(get_permission_repository)]


AuthServiceDependency = Annotated[
    AuthService,
    Depends(get_auth_service),
]
IdentityServiceDependency = Annotated[
    IdentityService,
    Depends(get_identity_service),
]

LibraryServiceDependency = Annotated[
    LibraryService,
    Depends(get_library_service),
]


SearchEngineDependency = Annotated[
    SearchBackend,
    Depends(get_search_engine),
]
