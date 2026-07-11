import asyncio
from uuid import UUID

from server.const import FragmentType
from server.infrastructure.pdf import PdfFile
from server.infrastructure.search import ContentFragment, SearchBackend
from server.infrastructure.storage import StorageBackend
from server.repositories import FileRepository


class IndexingService:
    def __init__(self, storage_backend: StorageBackend, search_engine: SearchBackend, file_repo: FileRepository):
        self._storage_backend = storage_backend
        self._search_engine = search_engine
        self._file_repo = file_repo

    async def index_pdf_file(self, file_id: UUID):

        file = await self._file_repo.get_by_id(file_id)

        async with self._storage_backend.as_local_path(file.storage_key) as path:
            pfg_file = PdfFile(path)
            pages = await asyncio.to_thread(pfg_file.extract_page_text)
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
