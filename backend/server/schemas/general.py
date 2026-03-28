from dataclasses import dataclass


@dataclass
class StorageFile:
    location: str
    size: int
    hash: str
    original_name: str
    page_count: int
