import asyncio
from collections.abc import AsyncIterator
from typing import IO


async def stream_bytes(data: bytes, chunk: int = 64 * 1024) -> AsyncIterator[bytes]:
    for i in range(0, len(data), chunk):
        yield data[i : i + chunk]


async def stream_io(fp: IO[bytes], chunk: int = 64 * 1024) -> AsyncIterator[bytes]:
    while data := await asyncio.to_thread(fp.read, chunk):
        yield data
