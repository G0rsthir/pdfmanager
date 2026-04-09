from datetime import UTC, datetime, timedelta
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, computed_field


class AuthenticateOidcRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    email: str
    auth_provider_id: UUID
    groups: list[str]
    name: str


class AuthenticatePasswordRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    email: str
    password: SecretStr


class RefreshSessionRequest(BaseModel):
    user_id: UUID
    session_id: UUID


class AuthResult(BaseModel):
    session_id: UUID
    session_expires_delta: timedelta
    session_revalidate_delta: timedelta
    user_id: UUID
    auth_provider_id: UUID
    role_id: UUID
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    scopes: list[str]

    @computed_field
    @property
    def session_expires_at(self) -> datetime:
        return self.session_expires_delta + self.created_at

    @computed_field
    @property
    def session_revalidate_at(self) -> datetime:
        return self.session_revalidate_delta + self.created_at


class RefreshResult(AuthResult):
    is_rotated: bool
