from dataclasses import dataclass

from pydantic import BaseModel

from server.infrastructure.pdf import FileMetadata
from server.infrastructure.storage import StorageFile


@dataclass(kw_only=True)
class DocumentStorageFile(StorageFile):
    thumbnail: str | None = None
    metadata: FileMetadata


@dataclass(kw_only=True)
class PdfStorageFile(DocumentStorageFile):
    page_count: int


class RevokeResponse(BaseModel):
    redirect_url: str | None = None
