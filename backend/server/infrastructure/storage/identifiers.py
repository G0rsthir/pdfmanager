import hashlib
from collections.abc import Callable
from pathlib import Path

from server.const import FileIdentifier


def koreader_partial_md5(path: Path) -> str:
    """
    KOReader util.partialMD5
    """
    md5 = hashlib.md5(usedforsecurity=False)
    with path.open("rb") as f:
        for offset in [0, *(1024 << (2 * i) for i in range(11))]:
            f.seek(offset)
            sample = f.read(1024)
            if not sample:
                break
            md5.update(sample)
    return md5.hexdigest()


FILE_IDENTIFIERS: dict[FileIdentifier, Callable[[Path], str]] = {
    FileIdentifier.KOREADER_HASH: koreader_partial_md5,
}
