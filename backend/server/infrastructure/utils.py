import asyncio
import os
import shutil
from collections.abc import Callable, Coroutine
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


def async_to_sync[T](awaitable: Callable[[], Coroutine[Any, Any, T]]) -> T:
    """
    Runs an async function in a synchronous context, ensuring the correct handling of event loops.

    This function cannot be used if an event loop is already running in the current context.

    Args:
        awaitable: The async function.

    Returns:
        The result of the async function.
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(awaitable())
    raise RuntimeError(
        "You can't run an async function from a sync function if an event loop is already running. "
        "Restructure your code or use threads"
    )


@contextmanager
def file_backup(file_path: str | Path, delete_on_success: bool = True, suffix: str = ".bak"):
    """
    Context manager to create a backup of a file before modification.
    If an exception occurs during modification, the original file is restored.

    Args:
        file_path: Path to the file to be backed up and modified.
        delete_on_success: Whether to delete the backup file after a successful operation.
        suffix: Suffix to add to the backup file name
    """
    backup_path = f"{file_path}{suffix}"

    # Copy also replaces
    shutil.copyfile(file_path, backup_path)
    try:
        yield
    except Exception as e:
        shutil.move(backup_path, file_path)
        raise e
    else:
        if delete_on_success:
            os.remove(backup_path)


@dataclass(kw_only=True)
class Entity:
    def to_dict(self):
        return {k: v for k, v in asdict(self).items() if not k.startswith("_")}


def sniff_content_type(head: bytes) -> str:
    """
    Content type sniffing based on file signatures (magic numbers).
    If needed, this can be replaced with python-magic.
    """
    if head.startswith(b"%PDF-"):
        return "application/pdf"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"GIF87a") or head.startswith(b"GIF89a"):
        return "image/gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head.startswith(b"PK\x03\x04"):
        return "application/zip"
    return "application/octet-stream"
