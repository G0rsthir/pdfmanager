from uuid import UUID

from server.infrastructure.pdf import PdfFile
from server.infrastructure.search import ContentFragment, SearchBackend
from server.infrastructure.storage import StorageBackend


class IndexingService:
    def __init__(self, storage_backend: StorageBackend, search_engine: SearchBackend):
        self._storage_backend = storage_backend
        self._search_engine = search_engine

    async def index_file(self, file_id: UUID, storage_key: str):
        """
        This proccess takes a lot of time
        """
        async with self._storage_backend.open_path(storage_key) as path:
            pfg_file = PdfFile(path)
            pages = pfg_file.extract_page_text()
            fragments = [
                ContentFragment(
                    content=page.text,
                    doc_id=file_id,
                    entity_type="pdf",
                    fragment_type="page",
                    page_number=page.page_number,
                )
                for page in pages
            ]
            await self._search_engine.index(fragments)
