from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from pydantic_core import PydanticCustomError

from server.const import AccessScopeEnum

if TYPE_CHECKING:
    from server.schemas.types import Scopes


def expiration_in_future_validator(date: datetime) -> datetime:
    if date < datetime.now(UTC):
        raise PydanticCustomError(
            "datetime_future",
            "Expiration date must be in the future",
            {"date": date},
        )
    return date


def access_scope_validator(scopes: Scopes) -> Scopes:
    if len(scopes.to_list()) == 0:
        raise PydanticCustomError("missing", "At least one scope is required")
    for scope in scopes.to_list():
        try:
            AccessScopeEnum(scope)
        except ValueError as e:
            raise PydanticCustomError("invalid", "'{scope}' is not a valid scope", {"scope": scope}) from e
    return scopes
