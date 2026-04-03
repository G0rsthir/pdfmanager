from typing import Annotated

from fastapi import APIRouter

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    UserServiceDependency,
)
from server.exceptions import FieldError, InvalidActionError
from server.schemas.account import DetailsUpdate
from server.schemas.security import AccessSessionContext, CredentialsUpdate

router = APIRouter(prefix="/account")


@router.put(path="/details", operation_id="UpdateUserAccountDetails")
async def update_details(
    details_update: DetailsUpdate,
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    user_service: UserServiceDependency,
):
    """
    Update current user's details.
    """
    try:
        await user_service.update_details(
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
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_WRITE])],
    user_service: UserServiceDependency,
):
    """
    Update current user's password.
    """
    try:
        await user_service.change_password(
            user_id=access_session.user_id,
            password_confirm=credentials.password_confirm,
            password_new=credentials.password_new,
            password_old=credentials.password_old,
        )
    except InvalidActionError as e:
        if e.rule == "invalid_old_password":
            raise FieldError(field="password_old", msg=e.msg) from e
        raise
