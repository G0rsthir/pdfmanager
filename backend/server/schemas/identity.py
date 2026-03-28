from uuid import UUID

from pydantic import BaseModel, ConfigDict, SecretStr, StrictStr, computed_field


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
    # Polymorphic responses are not yet supported by the openapi-ts SDK
    # Return only basic provider parameters
    auth_provider: AuthProviderResponse


class UserSessionResponse(BaseModel):
    """
    Provides relevant information about the logged-in user. Should not include authentication data.
    """

    user_id: UUID
    user: UserResponse
    session_id: UUID
