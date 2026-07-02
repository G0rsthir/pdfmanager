import re
from dataclasses import dataclass, field
from datetime import date
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader
from pypdfium2 import PdfDocument


@dataclass(kw_only=True)
class PaginatedText:
    text: str
    page_number: int


@dataclass
class InMemoryImage:
    image_bytes: bytes
    content_type: str = "image/webp"
    extension: str = ".webp"


@dataclass(kw_only=True)
class FileMetadata:
    title: str | None = None
    authors: list[str] = field(default_factory=list)
    subjects: list[str] = field(default_factory=list)  # tag suggestions
    description: str | None = None
    language: str | None = None
    publisher: str | None = None
    published: date | None = None
    identifier: str | None = None  # ISBN / DOI


def _clean(value: object) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    return text or None


def _split(value: object, sep: str = r"[;,]") -> list[str]:
    text = _clean(value)
    return [p.strip() for p in re.split(sep, text) if p.strip()] if text else []


_AUTHOR_SEPARATORS = re.compile(r"\s*(?:;|&|/|\band\b)\s*", re.IGNORECASE)


def _split_authors(value: object) -> list[str]:
    text = _clean(value)
    if not text:
        return []

    authors: list[str] = []
    for chunk in _AUTHOR_SEPARATORS.split(text):
        chunk = chunk.strip()
        if chunk:
            authors.extend(_split_comma_authors(chunk))
    return authors


def _split_comma_authors(text: str) -> list[str]:
    parts = [p.strip() for p in text.split(",") if p.strip()]
    if len(parts) <= 1:
        return parts

    if len(parts) == 2 and not all(" " in p for p in parts):
        return [text]

    return parts


class PdfFile:
    def __init__(self, file: Path):
        self._file = file
        self._doc: PdfDocument | None = None
        self._reader: PdfReader | None = None

    @property
    def doc(self) -> PdfDocument:
        if self._doc:
            return self._doc
        self._doc = PdfDocument(self._file)
        return self._doc

    @property
    def reader(self) -> PdfReader:
        if self._reader:
            return self._reader
        self._reader = PdfReader(self._file)
        return self._reader

    def extract_page_text(self) -> list[PaginatedText]:
        pages: list[PaginatedText] = []
        for i, page in enumerate(self.reader.pages, start=1):
            text = page.extract_text() or ""
            pages.append(PaginatedText(text=text, page_number=i))
        return pages

    @property
    def page_count(self) -> int:
        return len(self.reader.pages)

    def render_page_as_image(self, page_number: int, width: int = 400) -> InMemoryImage:
        page_index = max(0, min(page_number - 1, len(self.doc) - 1))

        page = self.doc[page_index]
        scale = width / page.get_width()
        bitmap = page.render(scale=scale)
        image = bitmap.to_pil()

        buf = BytesIO()
        image.save(buf, format="WEBP", quality=80)
        return InMemoryImage(image_bytes=buf.getvalue(), content_type="image/webp", extension=".webp")

    def metadata(self) -> FileMetadata:
        info = self.reader.metadata
        if info is None:
            return FileMetadata()

        try:
            created = info.creation_date
        except Exception:
            created = None

        return FileMetadata(
            title=_clean(info.title),
            authors=_split_authors(info.author),
            subjects=_split(info.keywords),
            description=_clean(info.subject),
            published=created.date() if created else None,
        )
