from dataclasses import dataclass

from pydantic import BaseModel

from server.infrastructure.storage import StorageFile


@dataclass(kw_only=True)
class PdfStorageFile(StorageFile):
    page_count: int
    thumbnail: str | None = None


class RevokeResponse(BaseModel):
    redirect_url: str | None = None
