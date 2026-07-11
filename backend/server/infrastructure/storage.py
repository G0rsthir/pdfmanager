import asyncio
import hashlib
import re
import shutil
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from dataclasses import dataclass
from logging import getLogger
from pathlib import Path
from typing import IO
from uuid import uuid4

import aiofiles
import aiofiles.os

from server.infrastructure.utils import Entity


@dataclass(kw_only=True)
class StorageFile(Entity):
    storage_key: str
    size: int
    hash: str
    original_name: str
    content_type: str


def _safe_ext(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return ext if re.fullmatch(r"\.[a-z0-9]{1,10}", ext) else ""


async def stream_bytes(data: bytes, chunk: int = 64 * 1024) -> AsyncIterator[bytes]:
    for i in range(0, len(data), chunk):
        yield data[i : i + chunk]


async def stream_io(fp: IO[bytes], chunk: int = 64 * 1024) -> AsyncIterator[bytes]:
    while data := await asyncio.to_thread(fp.read, chunk):
        yield data


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, scope: str, filename: str, stream: AsyncIterator[bytes], content_type: str) -> StorageFile:
        pass

    @abstractmethod
    def open(self, storage_key: str) -> AbstractAsyncContextManager[AsyncIterator[bytes]]:
        pass

    @abstractmethod
    def as_local_path(self, storage_key: str) -> AbstractAsyncContextManager[Path]:
        pass

    @abstractmethod
    async def delete(self, storage_key: str):
        pass

    @abstractmethod
    async def delete_scope(self, scope: str):
        pass

    @abstractmethod
    async def delete_many(self, storage_keys: list[str]):
        pass


class LocalStorageBackend(StorageBackend):
    CHUNK_SIZE = 64 * 1024

    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(exist_ok=True, parents=True)
        self._logger = getLogger(__name__)

    def _resolve(self, key: str) -> Path:
        path = (self.base_dir / key).resolve()
        if not path.is_relative_to(self.base_dir):
            raise ValueError(f"Path traversal detected: {key}")
        return path

    async def save(self, scope: str, filename: str, stream: AsyncIterator[bytes], content_type: str) -> StorageFile:
        scope_dir = self._resolve(scope)
        await aiofiles.os.makedirs(scope_dir, exist_ok=True)

        # Stream into a temp file while hashing
        hasher = hashlib.sha256()
        temp_path = scope_dir / f".tmp_{uuid4()}"
        file_size = 0
        try:
            async with aiofiles.open(temp_path, "wb") as f:
                async for chunk in stream:
                    hasher.update(chunk)
                    await f.write(chunk)
                    file_size += len(chunk)

            file_hash = hasher.hexdigest()

            final_path = scope_dir / f"{uuid4()}{_safe_ext(filename)}"

            if await aiofiles.os.path.exists(final_path):
                # Same content already stored
                raise FileExistsError(f"File already exists: {final_path}")
            await aiofiles.os.rename(temp_path, final_path)
        except BaseException:
            if await aiofiles.os.path.exists(temp_path):
                await aiofiles.os.remove(temp_path)
            raise

        return StorageFile(
            storage_key=str(final_path.relative_to(self.base_dir)),
            size=file_size,
            hash=file_hash,
            original_name=filename,
            content_type=content_type,
        )

    async def delete(self, storage_key: str):
        path = self._resolve(storage_key)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {path}")
        await aiofiles.os.remove(path)

    async def delete_scope(self, scope: str):
        scope_dir = self._resolve(scope)
        if not await aiofiles.os.path.exists(scope_dir):
            return
        # rmtree is blocking
        await asyncio.to_thread(shutil.rmtree, scope_dir)

    async def delete_many(self, storage_keys: list[str]):
        for key in storage_keys:
            try:
                await self.delete(key)
            except Exception as exc:
                self._logger.warning(f"storage cleanup failed for {key}: {exc}")

    @asynccontextmanager
    async def open(self, storage_key: str) -> AsyncGenerator[AsyncIterator[bytes]]:
        path = self._resolve(storage_key)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {path}")

        async with aiofiles.open(path, "rb") as f:

            async def chunks() -> AsyncIterator[bytes]:
                while data := await f.read(self.CHUNK_SIZE):
                    yield data

            yield chunks()

    @asynccontextmanager
    async def as_local_path(self, storage_key: str) -> AsyncGenerator[Path]:
        path = self._resolve(storage_key)
        if not await aiofiles.os.path.exists(path):
            raise FileNotFoundError(f"File not found: {path}")
        yield path
