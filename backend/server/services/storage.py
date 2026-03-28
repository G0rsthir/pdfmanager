from uuid import UUID

from fastapi import UploadFile
from pypdf import PdfReader

from server.infrastructure.storage import StorageBackend
from server.schemas.general import StorageFile


class StorageService:
    def __init__(self, backend: StorageBackend):
        self.backend = backend

    async def save_pdf_upload(self, user_id: UUID, file: UploadFile) -> StorageFile:
        async def stream():
            while chunk := await file.read(64 * 1024):
                yield chunk

        filename = file.filename or "unnamed.pdf"
        result = await self.backend.save(scope=f"pdf/{str(user_id)}", filename=filename, data=stream())

        path = await self.backend.get_path(result.location)
        result.page_count = len(PdfReader(path).pages)
        return result

    async def get_path(self, location: str):
        return await self.backend.get_path(location=location)

    async def delete_file(self, location: str) -> None:
        await self.backend.delete(location)
