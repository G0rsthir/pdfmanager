import hashlib
import re
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import aiofiles
import aiofiles.os

from server.schemas.general import StorageFile


def sanitize_name(name: str) -> str:
    name = Path(name).name
    name = re.sub(r"[^\w.\-]", "_", name)
    name = re.sub(r"[_.]{2,}", "_", name)
    name = name.lstrip(".")
    return name or "unnamed"


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, scope: str, filename: str, data: AsyncIterator[bytes]) -> StorageFile:
        pass

    @abstractmethod
    async def get_path(self, location: str) -> Path:
        pass

    @abstractmethod
    async def delete(self, location: str) -> None:
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(exist_ok=True, parents=True)

    def _resolve(self, location: str) -> Path:
        path = (self.base_dir / location).resolve()
        if not path.is_relative_to(self.base_dir):
            raise ValueError(f"Path traversal detected: {location}")
        return path

    def _scope_dir(self, scope: str) -> Path:
        return self.base_dir / scope

    async def save(self, scope: str, filename: str, data: AsyncIterator[bytes]) -> StorageFile:
        scope_dir = self._scope_dir(scope)
        await aiofiles.os.makedirs(scope_dir, exist_ok=True)

        # Write to temp file and compute hash
        hasher = hashlib.sha256()
        temp_path = scope_dir / f".tmp_{uuid4()}"
        file_size = 0
        async with aiofiles.open(temp_path, "wb") as f:
            async for chunk in data:
                hasher.update(chunk)
                await f.write(chunk)
                file_size += len(chunk)

        file_hash = hasher.hexdigest()
        safe_name = sanitize_name(filename)

        final_path = scope_dir / f"{file_hash[:16]}_{safe_name}"

        if await aiofiles.os.path.exists(final_path):
            # Same content already stored
            await aiofiles.os.remove(temp_path)
        else:
            await aiofiles.os.rename(temp_path, final_path)

        return StorageFile(
            location=str(final_path.relative_to(self.base_dir)),
            size=file_size,
            hash=file_hash,
            original_name=filename,
            page_count=1,
        )

    async def delete(self, location: str) -> None:
        path = self._resolve(location)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {location}")
        await aiofiles.os.remove(path)

    async def get_path(self, location: str) -> Path:
        path = self._resolve(location)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {location}")
        return path
