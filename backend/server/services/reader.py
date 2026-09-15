from uuid import UUID

from server.const import FileIdentifier, ResourcePermissionCapability
from server.models import ORMFile
from server.repositories import FileRepository, PermissionRepository


class ReaderService:
    def __init__(
        self,
        file_repo: FileRepository,
        permission_repo: PermissionRepository,
    ):
        self._file_repo = file_repo
        self._permission_repo = permission_repo

    async def resolve_koreader_file(self, user_id: UUID, document: str):
        return await self.resolve_sync_file(user_id=user_id, scheme=FileIdentifier.KOREADER_HASH, value=document)

    async def resolve_sync_file(self, user_id: UUID, scheme: str, value: str) -> ORMFile | None:
        candidates = await self._file_repo.list_by_identifier(scheme, value)
        perms = await self._permission_repo.get_effective_for_files(files=candidates, user_id=user_id)

        syncable: list[ORMFile] = []
        for f in candidates:
            perm = perms.get(f.id)
            if not perm or not perm.can(ResourcePermissionCapability.SYNC_PROGRESS):
                continue
            syncable.append(f)

        if len(syncable) <= 1:
            return syncable[0] if syncable else None

        # Same file can be uploaded more than one time
        states = await self._file_repo.list_states_by_file_ids(file_ids=[f.id for f in syncable], user_id=user_id)

        def rank(f: ORMFile):
            state = states.get(f.id)
            return (
                state is not None and state.last_read_at is not None,
                state.last_read_at if state else None,
                f.created_at,
            )

        return max(syncable, key=rank)
