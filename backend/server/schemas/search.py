from typing import Literal

from pydantic import BaseModel, computed_field

from server.const import FragmentType
from server.schemas.library import FileResponse
from server.schemas.query import PaginationQueryParams


class SearchFilesQueryParams(PaginationQueryParams):
    tags: list[str] | None = None
    name: str | None = None
    description: str | None = None
    text: str | None = None
    comment: str | None = None
    label: str | None = None

    def searches(self) -> list[tuple[str, list[FragmentType] | None]]:
        out: list[tuple[str, list[FragmentType] | None]] = []
        if self.text:
            out.append((self.text, [FragmentType.PAGE, FragmentType.TITLE, FragmentType.DESCRIPTION]))
        if self.comment:
            out.append((self.comment, [FragmentType.COMMENT]))
        if self.label:
            out.append((self.label, [FragmentType.LABEL]))
        return out


class SearchHitResponse(BaseModel):
    snippet: str
    page_number: int | None = None
    fragment_type: FragmentType
    rank: float


class FileSearchResponse(BaseModel):
    file: FileResponse
    hits: list[SearchHitResponse]

    @computed_field
    @property
    def score(self) -> Literal["weak", "good", "strong"]:
        if not self.hits:
            return "good"
        rank = min(h.rank for h in self.hits)
        if rank < -8:
            return "strong"
        if rank < -3:
            return "good"
        return "weak"
