from dataclasses import dataclass
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
