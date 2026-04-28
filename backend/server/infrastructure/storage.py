import hashlib
import re
import shutil
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from dataclasses import dataclass
from logging import getLogger
from pathlib import Path
from typing import IO
from uuid import uuid4

import aiofiles
import aiofiles.os

from server.exceptions import DuplicateResourceError
from server.infrastructure.utils import Entity


@dataclass(kw_only=True)
class StorageFile(Entity):
    storage_key: str
    size: int
    hash: str
    original_name: str
    content_type: str


def sanitize_name(name: str) -> str:
    name = Path(name).name
    name = re.sub(r"[^\w.\-]", "_", name)
    name = re.sub(r"[_.]{2,}", "_", name)
    name = name.lstrip(".")
    return name or "unnamed"


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, scope: str, filename: str, data: IO[bytes]) -> StorageFile:
        pass

    @abstractmethod
    def open(self, storage_key: str) -> AbstractAsyncContextManager[IO[bytes]]:
        pass

    @abstractmethod
    def open_path(self, storage_key: str) -> AbstractAsyncContextManager[Path]:
        pass

    @abstractmethod
    async def delete(self, location: str):
        pass

    @abstractmethod
    async def delete_scope(self, scope: str):
        pass

    @abstractmethod
    async def delete_many(self, locations: list[str]):
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(exist_ok=True, parents=True)
        self._logger = getLogger(__name__)

    def _resolve(self, location: str) -> Path:
        path = (self.base_dir / location).resolve()
        if not path.is_relative_to(self.base_dir):
            raise ValueError(f"Path traversal detected: {location}")
        return path

    def _scope_dir(self, scope: str) -> Path:
        return self.base_dir / scope

    async def save(self, scope: str, filename: str, data: IO[bytes]) -> StorageFile:
        scope_dir = self._scope_dir(scope)
        await aiofiles.os.makedirs(scope_dir, exist_ok=True)

        # Write to temp file and compute hash
        hasher = hashlib.sha256()
        temp_path = scope_dir / f".tmp_{uuid4()}"
        file_size = 0
        async with aiofiles.open(temp_path, "wb") as f:
            while chunk := data.read(64 * 1024):
                hasher.update(chunk)
                await f.write(chunk)
                file_size += len(chunk)

        file_hash = hasher.hexdigest()
        safe_name = sanitize_name(filename)

        final_path = scope_dir / f"{file_hash[:16]}_{safe_name}"

        if await aiofiles.os.path.exists(final_path):
            # Same content already stored
            await aiofiles.os.remove(temp_path)
            raise DuplicateResourceError(f"File already exists: {final_path}")
        else:
            await aiofiles.os.rename(temp_path, final_path)

        return StorageFile(
            storage_key=str(final_path.relative_to(self.base_dir)),
            size=file_size,
            hash=file_hash,
            original_name=filename,
            # TODO autodiscovery
            content_type="application/pdf",
        )

    async def delete(self, location: str) -> None:
        path = self._resolve(location)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {location}")
        await aiofiles.os.remove(path)

    async def delete_scope(self, scope: str) -> None:
        scope_dir = self._scope_dir(scope)
        if not await aiofiles.os.path.exists(scope_dir):
            return
        shutil.rmtree(scope_dir)

    async def delete_many(self, locations: list[str]):
        for loc in locations:
            try:
                await self.delete(loc)
            except Exception as exc:
                self._logger.warning("storage cleanup failed for %s: %s", loc, exc)

    @asynccontextmanager
    async def open(self, storage_key: str) -> AsyncGenerator[IO[bytes]]:
        path = self._resolve(storage_key)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {storage_key}")
        with open(path, "rb") as f:
            yield f

    @asynccontextmanager
    async def open_path(self, storage_key: str) -> AsyncGenerator[Path]:
        path = self._resolve(storage_key)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {storage_key}")
        yield path
