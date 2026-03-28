from fastapi import APIRouter

from server.dependencies import (
    UserRepositoryDependency,
    UserServiceDependency,
)
from server.schemas.config import AppStateResponse
from server.schemas.identity import SetupUser, UserResponse

router = APIRouter(prefix="/setup")


@router.get(path="/state", operation_id="GetAppState")
async def state(user_repo: UserRepositoryDependency) -> AppStateResponse:
    """
    Get current app state
    """

    is_initial_user_created = await user_repo.is_initial_user_exists()

    return AppStateResponse(is_initial_user_created=is_initial_user_created)


@router.post(path="/user", response_model=UserResponse, operation_id="CreateSetupUser")
async def setup_user(
    data: SetupUser,
    user_service: UserServiceDependency,
    user_repo: UserRepositoryDependency,
):
    """
    Create initial app admin user
    """

    await user_service.create_initial_user(data)
    return await user_repo.get_by_email(data.email)


@router.get(path="/status", operation_id="GetAppStatus")
async def status():
    """
    liveness / readiness probe
    """
    pass
