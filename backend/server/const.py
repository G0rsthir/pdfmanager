from enum import Enum, StrEnum
from typing import Final, Literal

ENCODING: Final = "utf-8"

LOGGING_LEVEL = Literal["DEBUG", "INFO", "ERROR"]

LOGGING_LEVEL_WITH_DEFAULT = Literal["DEFAULT"] | LOGGING_LEVEL


class UnsetEnum(Enum):
    UNSET = "UNSET"


UNSET = UnsetEnum.UNSET


class EnvironmentsEnum(StrEnum):
    PRODUCTION = "production"
    DEVELOPMENT = "development"


class TagEnum(StrEnum):
    AUTHENTICATION = "authentication"
    IDENTITY = "identity"
    LIBRARY = "library"
    SETTINGS = "settings"
    SETUP = "setup"
    LOGS = "logs"
    ACCOUNT = "account"
    GENERAL = "general"


class ScopesEnum(StrEnum):
    TOKEN_REFRESH = "token:refresh"
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"
    USER_READ = "user:read"
    USER_WRITE = "user:write"


class RolesEnum(StrEnum):
    ADMIN = "ADMIN"
    USER = "USER"
    AUDIT = "AUDIT"


class AuthProviderTypesEnum(StrEnum):
    LOCAL = "LOCAL"
    OIDC = "OIDC"
