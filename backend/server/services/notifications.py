from uuid import UUID

from server.repositories import CollectionRepository, FileRepository
from server.schemas.notifications import DuplicateFilesNotification, Notification


class NotificationService:
    def __init__(
        self,
        collection_repo: CollectionRepository,
        file_repo: FileRepository,
    ):
        self._collection_repo = collection_repo
        self._file_repo = file_repo

    async def list_notifications(self, user_id: UUID) -> list[Notification]:
        notifications: list[Notification] = []

        duplicates = await self._get_duplicate_files(user_id)
        if duplicates:
            notifications.append(duplicates)

        return notifications

    async def _get_duplicate_files(self, user_id: UUID) -> DuplicateFilesNotification | None:
        owned_collection_ids = await self._collection_repo.list_owned_ids(user_id)
        files = await self._file_repo.list_duplicates(owned_collection_ids)
        if not files:
            return None

        return DuplicateFilesNotification(
            count=len(files),
            group_count=len({f.file_hash for f in files}),
        )
