from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Request, Security
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from sqlalchemy.ext.asyncio import AsyncSession

from server.const import ScopesEnum
from server.infrastructure.storage import LocalStorageBackend
from server.repositories import (
    AuthProviderRepository,
    CollectionRepository,
    FileRepository,
    FolderRepository,
    RoleRepository,
    SessionRepository,
    TagRepository,
    UserRepository,
)
from server.runtime import RuntimeContainer
from server.security.loader import AUTH_TOKEN_URL
from server.services.auth import AuthService
from server.services.identity import IdentityService
from server.services.library import LibraryService
from server.services.storage import StorageService
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
    collection_repo: CollectionRepositoryDependency,
    folder_repo: FolderRepositoryDependency,
    file_repo: FileRepositoryDependency,
    tags_repo: TagRepositoryDependency,
) -> LibraryService:
    return LibraryService(
        collection_repo=collection_repo, folder_repo=folder_repo, file_repo=file_repo, tags_repo=tags_repo
    )


def get_storage_service(request: Request) -> StorageService:
    env: AppEnvSettings = request.app.state.env
    backend = LocalStorageBackend(env.STORAGE_DIR)
    return StorageService(backend=backend)


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


def get_folder_repository(
    db: DBSessionDependency,
) -> FolderRepository:
    return FolderRepository(db)


DBSessionDependency = Annotated[AsyncSession, Depends(get_db_session)]
EnvSettingsDependency = Annotated[AppEnvSettings, Depends(get_env_settings)]

TokenServiceDependency = Annotated[TokenResponseService, Depends(get_token_service)]

TagRepositoryDependency = Annotated[TagRepository, Depends(get_tag_repository)]
RoleRepositoryDependency = Annotated[RoleRepository, Depends(get_role_repository)]
FileRepositoryDependency = Annotated[FileRepository, Depends(get_file_repository)]
CollectionRepositoryDependency = Annotated[CollectionRepository, Depends(get_collection_repository)]
FolderRepositoryDependency = Annotated[FolderRepository, Depends(get_folder_repository)]
UserRepositoryDependency = Annotated[UserRepository, Depends(get_user_repository)]
SessionRepositoryDependency = Annotated[SessionRepository, Depends(get_session_repository)]
AuthProviderRepositoryDependency = Annotated[AuthProviderRepository, Depends(get_auth_provider_repository)]
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


StorageServiceDependency = Annotated[
    StorageService,
    Depends(get_storage_service),
]
