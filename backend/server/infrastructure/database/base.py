from datetime import UTC, datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import JSON, MetaData, String
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
)
from sqlalchemy.types import DateTime, TypeDecorator

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class DateTimeUTC(TypeDecorator[datetime]):
    """Timezone Aware DateTime.

    Ensure UTC is stored in the database and that TZ aware dates are returned for all dialects.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    @property
    def python_type(self) -> type[datetime]:
        return datetime

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return value
        if not value.tzinfo:
            msg = "tzinfo is required"
            raise TypeError(msg)
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class EnumList[E: Enum](TypeDecorator[list[E]]):
    """
    List of enums, stored as a JSON array
    """

    impl = JSON
    cache_ok = True

    def __init__(self, enum: type[E], *args, **kwargs):
        self.enum = enum
        super().__init__(*args, **kwargs)

    @property
    def python_type(self) -> type[list[E]]:
        return list

    def process_bind_param(self, value: list[E] | None, dialect) -> list | None:
        if value is None:
            return None
        return list(dict.fromkeys(self.enum(member).value for member in value))

    def process_result_value(self, value: list | None, dialect) -> list[E] | None:
        if value is None:
            return None
        return [self.enum(item) for item in value]


class EnumValue[E: Enum](TypeDecorator[E]):
    """
    A single enum, stored as string
    """

    impl = String
    cache_ok = True

    def __init__(self, enum: type[E], *args, **kwargs):
        self.enum = enum
        super().__init__(*args, **kwargs)

    @property
    def python_type(self) -> type[E]:
        return self.enum

    def process_bind_param(self, value: E | None, dialect) -> str | None:
        return None if value is None else self.enum(value).value

    def process_result_value(self, value: str | None, dialect) -> E | None:
        return None if value is None else self.enum(value)


class AuditMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTimeUTC(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTimeUTC(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    metadata = metadata
    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
