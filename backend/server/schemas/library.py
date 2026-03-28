from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field


class ListFilesQueryParams(BaseModel):
    is_favorite: bool | None = None
    tags: list[str] | None = None
    text: list[str] | None = None


class CreateCollectionRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    parent_id: UUID | None = None


class UpdateCollectionRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    parent_id: UUID | None = None


class FolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    parent_id: UUID | None = None
    files: list[FileResponse] = Field(default_factory=list)


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    folder_id: UUID | None = None
    description: str | None = None
    tags: list[TagResponse] = Field(default_factory=list)
    is_favorite: bool
    page_count: int
    current_page: int
    scale: str

    @computed_field
    @property
    def tags_name_list(self) -> list[str]:
        return [tag.name for tag in self.tags]


class PatchFileStateRequest(BaseModel):
    current_page: int | None = Field(default=None, ge=1)
    scale: str | None = None


class UpdateFileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    tags: list[str] = Field(default_factory=list)
    folder_id: UUID | None = None
    is_favorite: bool = False


class CreateFolderRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    parent_id: UUID | None = None


class UpdateFolderRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    parent_id: UUID | None = None


class LibraryTreeNode(BaseModel):
    id: UUID
    name: str
    children: list[LibraryTreeNode] = Field(default_factory=list)
    entity_type: Literal["collection", "folder"]
    parent_id: UUID | None = None


class UpdateTagRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    color: str


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str


class TagDetailResponse(TagResponse):
    file_count: int
