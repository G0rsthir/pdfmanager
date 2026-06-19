from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    AfterValidator,
    AliasChoices,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    StrictStr,
    computed_field,
)

from server.schemas._validation import access_scope_validator, expiration_in_future_validator
from server.schemas.identity import UserSummaryResponse
from server.schemas.types import Scopes


class AuthSessionContextBase(BaseModel):
    model_config = ConfigDict(serialize_by_alias=True)

    user_id: UUID = Field(validation_alias=AliasChoices("user_id", "sub"), serialization_alias="sub")
    session_id: UUID = Field(validation_alias=AliasChoices("session_id", "sid"), serialization_alias="sid")
    scopes: Scopes | None = None


class AccessSessionContext(AuthSessionContextBase):
    """
    Stores data about user's active (current) access session.
    """

    pass


class RefreshSessionContext(AuthSessionContextBase):
    """
    Stores data about user's active (current) refresh session.
    """

    pass


class AccessToken(BaseModel):
    """
    API access token.
    """

    access_token: str
    token_type: str
    expires: datetime


class Credentials(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    email: StrictStr
    password: SecretStr


class CredentialsUpdate(BaseModel):
    """
    This model is used to change user credentials.
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    password_old: SecretStr
    password_new: SecretStr
    password_confirm: SecretStr


class CredentialsReset(BaseModel):
    """
    This model is used to reset (by admin) user credentials.
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    password: SecretStr
    password_confirm: SecretStr


class Cookie(BaseModel):
    """
    An HTTP cookie
    """

    key: str
    value: str = ""
    max_age: int | None = None
    expires: datetime | str | int | None = None
    httponly: bool = True
    path: str | None = "/"
    samesite: Literal["lax", "strict", "none"] | None = "strict"


class OidcUser(BaseModel):
    name: str
    email: str
    groups: list[str]
    subject: str | None = None
    session_id: str | None = None


class OidcAuthResult(BaseModel):
    token: dict
    user_info: dict
    user: OidcUser


class ApiKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    expires_at: datetime
    is_revoked: bool
    user_id: UUID
    scopes: Scopes

    @computed_field
    @property
    def scopes_str(self) -> str:
        return self.scopes.to_str()

    @computed_field
    @property
    def is_expired(self) -> bool:
        return datetime.now(UTC) > self.expires_at

    user: UserSummaryResponse | None = None


class ApiKeyCreateRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    description: str
    expires_at: Annotated[AwareDatetime, AfterValidator(expiration_in_future_validator)]
    user_id: UUID
    scopes: Annotated[Scopes, AfterValidator(access_scope_validator)]


class ApiKeyResetRequest(BaseModel):
    expires_at: Annotated[AwareDatetime, AfterValidator(expiration_in_future_validator)]


class ApiKeyCreateResultResponse(BaseModel):
    token: str
    expires_at: datetime
    user_id: UUID


class ApiKeyCreateResult(BaseModel):
    session_id: UUID

    user_id: UUID
    created_at: AwareDatetime
    auth_provider_id: UUID

    scopes: Scopes
    session_expires_at: AwareDatetime
    is_service: bool = True
