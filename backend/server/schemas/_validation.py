from __future__ import annotations

from datetime import UTC, datetime

from pydantic_core import PydanticCustomError


def expiration_in_future_validator(date: datetime) -> datetime:
    if date < datetime.now(UTC):
        raise PydanticCustomError(
            "datetime_future",
            "Expiration date must be in the future",
            {"date": date},
        )
    return date


def unique_scopes[S](scopes: list[S]) -> list[S]:
    return list(dict.fromkeys(scopes))
