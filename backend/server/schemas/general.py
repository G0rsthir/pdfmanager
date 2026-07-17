from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field

from server.infrastructure.pdf import FileMetadata
from server.infrastructure.storage import StorageFile
from server.infrastructure.tasks import TaskStatusEnum


@dataclass(kw_only=True)
class DocumentStorageFile(StorageFile):
    thumbnail: str | None = None
    metadata: FileMetadata


@dataclass(kw_only=True)
class PdfStorageFile(DocumentStorageFile):
    page_count: int


class RevokeResponse(BaseModel):
    redirect_url: str | None = None


class TaskActiveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: TaskStatusEnum
    attempt: int
    subject: str | None
    progress: float | None = Field(default=None, ge=0, le=1)
    detail: str | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def display_name(self) -> str:
        return self.name[:1].upper() + self.name[1:].replace("_", " ")


class TaskHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: TaskStatusEnum
    started_at: datetime
    duration_ms: int | None
    error: str | None
    subject: str | None

    @computed_field
    @property
    def display_name(self) -> str:
        return self.name[:1].upper() + self.name[1:].replace("_", " ")

    @computed_field
    @property
    def display_duration(self) -> str:
        if self.duration_ms is None:
            return "—"
        if self.duration_ms < 1000:
            return f"{self.duration_ms}ms"
        seconds = self.duration_ms / 1000
        if seconds < 60:
            return f"{seconds:.1f}s"
        minutes = int(seconds // 60)
        return f"{minutes}m {round(seconds % 60)}s"
