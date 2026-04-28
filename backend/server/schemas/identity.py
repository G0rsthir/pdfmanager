from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, PlainSerializer, SecretStr, StrictStr, computed_field

from server.schemas.types import MaskedStr


class SetupUser(BaseModel):
    """
    Create initial application user
    """

    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    email: StrictStr
    password: SecretStr
    password_confirm: SecretStr
    name: str


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    is_protected: bool
    entity_type: str
    scopes: str

    @computed_field
    @property
    def scope_list(self) -> list[str]:
        return self.scopes.split(" ")

    @scope_list.setter
    def scope_list(self, scopes: list[str]):
        self.scopes = " ".join(scopes)


class AuthProviderResponse(BaseModel):
    """
    Generic response model for authentication providers.

    Specific provider types may have additional parameters, but all share these common parameters.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    entity_type: str
    is_enabled: bool
    is_protected: bool


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: StrictStr
    auth_provider_id: UUID
    is_enabled: bool
    role_id: UUID
    role: RoleResponse
    is_external: bool
    # Polymorphic responses are not yet supported by the openapi-ts SDK
    # Return only basic provider parameters
    auth_provider: AuthProviderResponse


class UserSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: StrictStr


class UserSessionResponse(BaseModel):
    """
    Provides relevant information about the logged-in user. Should not include authentication data.
    """

    user_id: UUID
    user: UserResponse
    session_id: UUID


class UserCreateRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    email: StrictStr
    password: SecretStr
    password_confirm: SecretStr
    is_enabled: bool
    role_id: UUID


class UserUpdateRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    email: StrictStr
    is_enabled: bool
    role_id: UUID


class AuthProviderOidcCreateRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str


class OidcGroupRule(BaseModel):
    group: str = Field(description="Name of the group as provided by the OIDC provider")
    role_id: Annotated[UUID, PlainSerializer(lambda v: str(v), return_type=str)] = Field(
        description="ID of the role to assign to users in this group"
    )


class AuthProviderOidcUpdateRequest(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    name: str
    is_enabled: bool = False
    client_id: str
    client_secret: SecretStr
    auto_discovery_url: HttpUrl
    additional_scopes: str = Field(default="", min_length=0)

    group_claim_name: str = Field(default="groups")
    group_claim_rules: list[OidcGroupRule] = Field(default_factory=list)
    auto_login: bool = False


class AuthProviderOidcResponse(AuthProviderResponse):
    entity_type: Literal["OIDC"]
    client_id: str
    client_secret: MaskedStr
    group_claim_name: str
    auto_discovery_url: str
    additional_scopes: str
    auto_login: bool
    group_claim_rules: list[OidcGroupRule]

    redirect_url: str = Field(
        description="URL to which the OIDC provider will redirect after successful authentication"
    )
    authorize_url: str = Field(
        description="URL to which the frontend should redirect the user to initiate OIDC authentication"
    )
