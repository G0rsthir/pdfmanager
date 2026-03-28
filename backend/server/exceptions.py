from fastapi import HTTPException, status

InvalidCredentialsException = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

InsufficientPermissionsException = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Insufficient permissions",
    headers={"WWW-Authenticate": "Bearer"},
)


class DomainError(Exception):
    """
    Base class for all domain-level errors
    """

    code = "domain_error"


class ForbiddenActionError(DomainError):
    code = "forbidden_action"


class AuthenticationError(ForbiddenActionError):
    code = "authentication_failed"


class InfrastructureError(Exception):
    """
    Base class for internal/system errors
    """

    code = "infrastructure_error"


class DataIntegrityError(InfrastructureError):
    code = "data_integrity_error"


class UnsupportedOperationError(InfrastructureError):
    code = "unsupported_operation"


class ResourceLimitExceededError(InfrastructureError):
    code = "resource_limit_exceeded"


class ConfigurationError(InfrastructureError):
    code = "configuration_error"


class ResourceNotFoundError(DomainError):
    code = "resource_not_found"

    def __init__(self, resource: str, identifier, msg: str | None = None):
        self.resource = resource
        self.identifier = str(identifier)
        if not msg:
            msg = f"{resource} not found: {self.identifier}"
        super().__init__(msg)


class UserNotFoundError(ResourceNotFoundError):
    code = "user_not_found"

    def __init__(self, identifier):
        super().__init__(resource="User", identifier=identifier)


class AuthProviderNotFoundError(ResourceNotFoundError):
    code = "auth_provider_not_found"

    def __init__(self, identifier, resource="AuthProvider"):
        super().__init__(resource=resource, identifier=identifier)


class RoleNotFoundError(ResourceNotFoundError):
    code = "role_not_found"

    def __init__(self, identifier):
        super().__init__(resource="Role", identifier=identifier)


class SessionNotFoundError(ResourceNotFoundError):
    code = "session_not_found"

    def __init__(self, identifier):
        super().__init__(resource="Session", identifier=identifier)


class CollectionNotFoundError(ResourceNotFoundError):
    code = "collection_not_found"

    def __init__(self, identifier, msg: str | None = None):
        super().__init__(resource="Collection", identifier=identifier, msg=msg)


class FolderNotFoundError(ResourceNotFoundError):
    code = "folder_not_found"

    def __init__(self, identifier, msg: str | None = None):
        super().__init__(resource="Folder", identifier=identifier, msg=msg)


class LibraryFileNotFoundError(ResourceNotFoundError):
    code = "file_not_found"

    def __init__(self, identifier, msg: str | None = None):
        super().__init__(resource="File", identifier=identifier, msg=msg)


class TagNotFoundError(ResourceNotFoundError):
    code = "tag_not_found"

    def __init__(self, identifier, msg: str | None = None):
        super().__init__(resource="Tag", identifier=identifier, msg=msg)


class InvalidActionError(DomainError):
    code = "invalid_action"

    def __init__(self, msg: str, rule: str):
        self.rule = rule
        self.msg = msg
        super().__init__(msg)
        self.add_note(f"Domain rule violated: {rule}")


class FieldError(DomainError):
    code = "field_validation_error"

    def __init__(self, field: str, msg: str):
        self.field = field
        self.msg = msg
        super().__init__(f"{self.field}: {self.msg}")


class FieldValidationErrors(DomainError):
    code = "field_validation_errors"

    def __init__(self, *errors: FieldError):
        self.errors = errors
        msg = f"Validation failed with {len(errors)} error(s)"
        self.errors = errors

        super().__init__(msg)
        for error in errors:
            self.add_note(f"{error.field}: {error.msg}")
