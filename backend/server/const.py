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
    SEARCH = "search"
    OPDS = "opds"
    READERS = "readers"


class RefreshScopeEnum(StrEnum):
    TOKEN_REFRESH = "token:refresh"


class AccessScope(StrEnum):
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    LIBRARY_READ = "library:read"
    LIBRARY_WRITE = "library:write"
    LIBRARY_SYNC = "library:sync"


class SessionTypeEnum(StrEnum):
    INTERACTIVE = "interactive"
    SERVICE = "service"


class RolesEnum(StrEnum):
    ADMIN = "ADMIN"
    USER = "USER"
    AUDIT = "AUDIT"


class AuthProviderTypesEnum(StrEnum):
    LOCAL = "LOCAL"
    OIDC = "OIDC"


class FileStatusEnum(StrEnum):
    UNREAD = "unread"
    READING = "reading"
    ON_HOLD = "on_hold"
    DROPPED = "dropped"
    READ = "read"
    WANT_TO_READ = "want_to_read"


class AssignmentLockReason(StrEnum):
    FORBIDDEN = "forbidden"
    INHERITED = "inherited"
    SELF = "self"
    OWNER = "owner"


class ResourcePermissionCapability(StrEnum):
    READ = "read"
    ANNOTATE = "annotate"
    WRITE = "write"
    DELETE = "delete"
    MANAGE_PERMISSIONS = "manage_permissions"
    SYNC_PROGRESS = "sync_progress"


class ResourcePermissionLevel(StrEnum):
    READ = "read"
    CONTRIBUTE = "contribute"
    MODIFY = "modify"
    OWNER = "owner"


RESOURCE_PERMISSIONS_LEVEL_CAPABILITIES: Final[
    dict[ResourcePermissionLevel, frozenset[ResourcePermissionCapability]]
] = {
    ResourcePermissionLevel.READ: frozenset(
        {ResourcePermissionCapability.READ, ResourcePermissionCapability.SYNC_PROGRESS}
    ),
    ResourcePermissionLevel.CONTRIBUTE: frozenset(
        {
            ResourcePermissionCapability.READ,
            ResourcePermissionCapability.ANNOTATE,
            ResourcePermissionCapability.SYNC_PROGRESS,
        }
    ),
    ResourcePermissionLevel.MODIFY: frozenset(
        {
            ResourcePermissionCapability.READ,
            ResourcePermissionCapability.ANNOTATE,
            ResourcePermissionCapability.WRITE,
            ResourcePermissionCapability.DELETE,
            ResourcePermissionCapability.SYNC_PROGRESS,
        }
    ),
    ResourcePermissionLevel.OWNER: frozenset(ResourcePermissionCapability),
}

RESOURCE_PERMISSIONS_LEVEL_WRITABLE = Literal[
    ResourcePermissionLevel.READ,
    ResourcePermissionLevel.CONTRIBUTE,
    ResourcePermissionLevel.MODIFY,
]
