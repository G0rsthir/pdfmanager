from dataclasses import dataclass

from pydantic import BaseModel


@dataclass
class StorageFile:
    location: str
    size: int
    hash: str
    original_name: str
    page_count: int


class RevokeResponse(BaseModel):
    redirect_url: str | None = None
