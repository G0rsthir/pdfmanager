from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, computed_field

from server.const import RESOURCE_PERMISSIONS
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


class InviteToCollectionRequest(BaseModel):
    email: str
    permission: Literal["read", "modify"]


class UpdateCollectionPermissionRequest(BaseModel):
    permission: Literal["read", "modify"]


class CollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    parent_id: UUID | None = None
    entity_type: Literal["folder", "group"]


class CollectionWithDetailsResponse(CollectionResponse):
    model_config = ConfigDict(from_attributes=True)

    owner: UserSummaryResponse

    # Helpful for permission calculation, but not part of the actual response
    target_permission: RESOURCE_PERMISSIONS | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def is_shared_with_current_user(self) -> bool:
        if self.target_permission and self.target_permission != "owner":
            return True

        return False

    @computed_field
    @property
    def is_read_only_by_current_user(self) -> bool:
        """
        Whether current user can only read this collection
        """

        if self.target_permission == "read":
            return True

        return False


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    collection_id: UUID | None = None
    description: str | None = None
    page_count: int
    tags: list[TagResponse] = Field(default_factory=list)

    authors: list[AuthorResponse] = Field(default_factory=list)
    published: date | None = None

    state: FileStateResponse

    # Helpful for permission calculation, but not part of the actual response
    target_permission: RESOURCE_PERMISSIONS | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def tags_name_list(self) -> list[str]:
        return [tag.name for tag in self.tags]

    @computed_field
    @property
    def is_read_only_by_current_user(self) -> bool:
        """
        Whether current user can only read this file
        """

        if self.target_permission == "read":
            return True

        return False


class FileStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_favorite: bool
    current_page: int
    scale: str

    last_read_at: AwareDatetime | None = None

    @classmethod
    def with_defaults(cls):
        return cls(is_favorite=False, current_page=1, scale="1.0", last_read_at=None)


class PatchFileStateRequest(BaseModel):
    current_page: int | None = Field(default=None, ge=1)
    scale: str | None = None
    is_favorite: bool | None = None


class UpdateFileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    tags: list[str] = Field(default_factory=list)
    collection_id: UUID
    authors: list[str] = Field(default_factory=list)
    published: date | None = None


class LibraryTreeNode(BaseModel):
    id: UUID
    name: str
    children: list[LibraryTreeNode] = Field(default_factory=list)
    entity_type: Literal["group", "folder"]
    parent_id: UUID | None = None

    # Helpful for permission calculation, but not part of the actual response
    target_parent: LibraryTreeNode | None = Field(default=None, exclude=True)
    target_permission: RESOURCE_PERMISSIONS | None = Field(default=None, exclude=True)
    target_permission_count: int | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def is_shared(self) -> bool:
        if self.target_permission_count and self.target_permission_count > 1:
            return True

        if self.target_parent and self.target_parent.is_shared:
            return True

        return False

    @computed_field
    @property
    def is_read_only_by_current_user(self) -> bool:
        if self.target_permission == "read":
            return True

        if self.target_permission in ("owner", "modify"):
            return False

        if self.target_parent and self.target_parent.is_read_only_by_current_user:
            return True

        return False


class UpdateTagRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    color: str


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    color: str


class AuthorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class TagWithDetailsResponse(TagResponse):
    file_count: int


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user: UserSummaryResponse
    inherited_from: UUID | None = None
    permission: RESOURCE_PERMISSIONS

    # Helpful for permission calculation, but not part of the actual response
    target_user_id: UUID = Field(exclude=True)
    target_permission: RESOURCE_PERMISSIONS | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def is_read_only_by_current_user(self) -> bool:
        """
        Whether current user can only read this assignment
        """

        if self.inherited_from is not None:
            return True

        if self.target_user_id == self.user.id:
            return True

        if self.target_permission == "read":
            return True

        if self.permission == "owner":
            return True

        return False


class ResourcePermissionResponse(BaseModel):
    id: UUID
    entity_type: str
    name: str
    assignments: list[AssignmentResponse]


class NormalizedRect(BaseModel):
    """
    All values are fractions (0..1) of the .page element's box,
    so they survive zoom / rotate without recomputation.
    """

    top: float = Field(ge=0, le=1)
    left: float = Field(ge=0, le=1)
    width: float = Field(ge=0, le=1)
    height: float = Field(ge=0, le=1)


class CreateAnnotationRequest(BaseModel):
    page: int
    body: str
    color: str
    excerpt: str
    rects: list[NormalizedRect]
    label: str | None = Field(default=None, description="User-set identifier, used to cross-reference.")


class PatchAnnotationRequest(BaseModel):
    label: str | None = Field(default=None, description="User-set identifier, used to cross-reference.")
    body: str | None = None
    color: str | None = None


class AnnotationResponse(CreateAnnotationRequest):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_id: UUID | None = None
    created_at: AwareDatetime
    author_name: str | None = None
