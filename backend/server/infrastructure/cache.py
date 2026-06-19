from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any


@dataclass
class Entry:
    obj: Any
    ttl: timedelta | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def is_expired(self) -> bool:
        if self.ttl is None:
            return False
        return datetime.now(UTC) > self.created_at + self.ttl


class Cache:
    _objects: dict[str, dict[str, Entry]] = {}

    @staticmethod
    def set(category: str, key: str, value, ttl: timedelta | None = None):
        try:
            Cache._objects[category]
        except KeyError:
            Cache._objects[category] = {}

        Cache._objects[category][key] = Entry(value, ttl=ttl)

    @staticmethod
    def get(category: str, key: str, default=None) -> Any:
        try:
            entry = Cache._objects[category][key]
            if entry.is_expired():
                Cache.remove(category, key)
                return default
            return entry.obj
        except Exception:
            return default

    @staticmethod
    def purge():
        Cache._objects = {}

    @staticmethod
    def remove(category: str, key: str):
        if category not in Cache._objects:
            return None

        Cache._objects[category].pop(key, None)
