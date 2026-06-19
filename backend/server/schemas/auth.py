from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, SecretStr

from server.schemas.types import Scopes


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

    user_id: UUID
    auth_provider_id: UUID
    created_at: AwareDatetime
    scopes: Scopes | None = None
    session_expires_at: AwareDatetime
    session_revalidate_at: AwareDatetime


class RefreshResult(AuthResult):
    is_rotated: bool
