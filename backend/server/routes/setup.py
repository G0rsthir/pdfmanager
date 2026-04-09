from fastapi import APIRouter, Request

from server.dependencies import (
    AuthProviderRepositoryDependency,
    IdentityServiceDependency,
    UserRepositoryDependency,
)
from server.schemas.config import AppStateResponse, SsoConfigResponse
from server.schemas.identity import SetupUser, UserResponse

router = APIRouter(prefix="/setup")


@router.get(path="/state", operation_id="GetAppState")
async def state(
    request: Request, user_repo: UserRepositoryDependency, provider_repo: AuthProviderRepositoryDependency
) -> AppStateResponse:
    """
    Get current app state
    """

    is_initial_user_created = await user_repo.is_initial_user_exists()

    sso_servers = []
    auto_login_sso_server = None
    auth_providers = await provider_repo.get_oidc_list()
    for provider in auth_providers:
        if provider.is_valid and provider.is_enabled:
            sso_url = str(request.url_for("oidc_authorize", id=provider.id))
            sso_server = SsoConfigResponse(url=sso_url, is_auto_login_enabled=provider.auto_login, name=provider.name)
            sso_servers.append(sso_server)
            if provider.auto_login:
                auto_login_sso_server = sso_server

    return AppStateResponse(
        is_initial_user_created=is_initial_user_created,
        sso_servers=sso_servers,
        auto_login_sso_server=auto_login_sso_server,
    )


@router.post(path="/user", response_model=UserResponse, operation_id="CreateSetupUser")
async def setup_user(
    data: SetupUser,
    identity_service: IdentityServiceDependency,
    user_repo: UserRepositoryDependency,
):
    """
    Create initial app admin user
    """

    await identity_service.create_initial_user(data)
    return await user_repo.get_by_email(data.email)


@router.get(path="/status", operation_id="GetAppStatus")
async def status():
    """
    liveness / readiness probe
    """
    pass
