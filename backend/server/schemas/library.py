from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field

from server.schemas.identity import UserSummaryResponse


class ListFilesQueryParams(BaseModel):
    is_favorite: bool | None = None
    tags: list[str] | None = None
    name: str | None = None
    description: str | None = None


class CreateCollectionRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    parent_id: UUID | None = None
    entity_type: Literal["folder", "group"]


class UpdateCollectionRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    parent_id: UUID | None = None


class CollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    parent_id: UUID | None = None
    entity_type: Literal["folder", "group"]


class CollectionWithDetailsResponse(CollectionResponse):
    model_config = ConfigDict(from_attributes=True)

    files: list[FileResponse] = Field(default_factory=list)


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    collection_id: UUID | None = None
    description: str | None = None
    page_count: int
    thumbnail: str | None = None
    tags: list[TagResponse] = Field(default_factory=list)

    state: FileStateResponse

    @computed_field
    @property
    def tags_name_list(self) -> list[str]:
        return [tag.name for tag in self.tags]


class FileStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_favorite: bool
    current_page: int
    scale: str

    @classmethod
    def with_defaults(cls):
        return cls(is_favorite=False, current_page=1, scale="1.0")


class PatchFileStateRequest(BaseModel):
    current_page: int | None = Field(default=None, ge=1)
    scale: str | None = None
    is_favorite: bool | None = None


class UpdateFileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    tags: list[str] = Field(default_factory=list)
    collection_id: UUID


class LibraryTreeNode(BaseModel):
    id: UUID
    name: str
    children: list[LibraryTreeNode] = Field(default_factory=list)
    entity_type: Literal["group", "folder"]
    parent_id: UUID | None = None
    # TODO
    is_shared: bool = False


class UpdateTagRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    color: str


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str


class TagWithDetailsResponse(TagResponse):
    file_count: int


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user: UserSummaryResponse
    inherited_from: UUID | None = None
    permission: Literal["owner", "read", "modify"]


class ResourcePermissionResponse(BaseModel):
    entity_type: str
    name: str
    assignments: list[AssignmentResponse]
