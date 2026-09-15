import asyncio
from logging import getLogger
from uuid import UUID

from server.infrastructure.pdf import PdfFile
from server.infrastructure.search import ContentFragment, FragmentType, SearchBackend
from server.infrastructure.storage import StorageBackend
from server.infrastructure.storage.identifiers import FILE_IDENTIFIERS
from server.models import ORMFileIdentifier
from server.repositories import FileRepository


class IndexingService:
    def __init__(self, storage_backend: StorageBackend, search_engine: SearchBackend, file_repo: FileRepository):
        self._storage_backend = storage_backend
        self._search_engine = search_engine
        self._file_repo = file_repo
        self._logger = getLogger(__name__)

    async def index_pdf_file(self, file_id: UUID):

        file = await self._file_repo.get_by_id(file_id)

        async with self._storage_backend.as_local_path(file.storage_key) as path:
            pfg_file = PdfFile(path)
            pages = await asyncio.to_thread(pfg_file.extract_page_text)

            await self._search_engine.delete_fragments(doc_id=file.id, fragment_type=FragmentType.PAGE)

            fragments = [
                ContentFragment(
                    content=page.text,
                    doc_id=file_id,
                    entity_type=file.content_type,
                    fragment_type=FragmentType.PAGE,
                    page_number=page.page_number,
                )
                for page in pages
            ]
            await self._search_engine.index(fragments)

    async def backfill_file_identifiers(self) -> int:
        added = 0
        for scheme, compute in FILE_IDENTIFIERS.items():
            for file in await self._file_repo.list_missing_identifier(scheme):
                try:
                    async with self._storage_backend.as_local_path(file.storage_key) as path:
                        value = await asyncio.to_thread(compute, path)
                except FileNotFoundError:
                    self._logger.warning(f"Missing storage for file {file.id}, skipping {scheme}")
                    continue
                self._file_repo.save(ORMFileIdentifier(file_id=file.id, scheme=scheme, value=value))
                added += 1
        await self._file_repo.commit()
        return added
