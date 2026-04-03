from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, SecretStr, StrictStr


class AuthSessionContextBase(BaseModel):
    user_id: UUID = Field(validation_alias=AliasChoices("user_id", "sub"), serialization_alias="sub")
    session_id: UUID = Field(validation_alias=AliasChoices("session_id", "sid"), serialization_alias="sid")
    auth_provider_id: UUID = Field(
        validation_alias=AliasChoices("auth_provider_id", "apid"), serialization_alias="apid"
    )


class AccessSessionContext(AuthSessionContextBase):
    """
    Stores data about user's active (current) access session.
    """

    role_id: UUID
    scopes: list[str]


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


class Cookie(BaseModel):
    """
    An HTTP cookie
    """

    key: str
    value: str = ""
    max_age: int | None = None
    expires: datetime | str | int | None = None
    httponly: bool = False
    path: str | None = "/"
    samesite: Literal["lax", "strict", "none"] | None = "strict"
