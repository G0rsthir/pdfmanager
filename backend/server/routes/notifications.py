from typing import Annotated

from fastapi import APIRouter

from server.const import AccessScope
from server.dependencies import AccessSecurity, NotificationServiceDependency
from server.routes._assemblers import build_notification_response
from server.schemas.notifications import NotificationResponse
from server.schemas.security import AccessSessionContext

router = APIRouter(prefix="/notifications")


@router.get(path="", operation_id="ListNotifications", response_model=list[NotificationResponse])
async def list_notifications(
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[AccessScope.USER_READ])],
    notification_service: NotificationServiceDependency,
):
    notifications = await notification_service.list_notifications(user_id=access_session.user_id)

    return [build_notification_response(notification) for notification in notifications]
