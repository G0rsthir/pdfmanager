from dataclasses import dataclass
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from server.const import NotificationType


class DuplicateFilesNotificationResponse(BaseModel):
    type: Literal[NotificationType.DUPLICATE_FILES]
    count: int
    group_count: int


NotificationResponse = Annotated[DuplicateFilesNotificationResponse, Field(discriminator="type")]


@dataclass(kw_only=True)
class DuplicateFilesNotification:
    # file count
    count: int
    group_count: int


type Notification = DuplicateFilesNotification
