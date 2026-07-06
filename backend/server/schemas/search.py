from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, computed_field

from server.const import FragmentType
from server.infrastructure.search import SearchHit
from server.schemas.library import AnnotationResponse, FileResponse
from server.schemas.query import PaginationQueryParams


@dataclass(kw_only=True)
class SearchFilter:
    query: str
    fragment_types: list[FragmentType] | None


@dataclass(kw_only=True)
class EnrichedHit(SearchHit):
    annotation: Any | None = None


@dataclass(kw_only=True)
class FileSearchResult:
    hits: list[EnrichedHit]
    best_score: float
    doc_id: UUID


class SearchFilesQueryParams(PaginationQueryParams):
    tags: list[str] | None = None
    authors: list[str] | None = None
    name: str | None = None
    description: str | None = None
    text: str | None = None
    annotation: str | None = None
    label: str | None = None

    def filters(self) -> list[SearchFilter]:
        out: list[SearchFilter] = []
        if self.text:
            out.append(
                SearchFilter(
                    query=self.text, fragment_types=[FragmentType.PAGE, FragmentType.TITLE, FragmentType.DESCRIPTION]
                )
            )
        # TODO add support for wildcard annotation search, not just text
        if self.annotation:
            out.append(SearchFilter(query=self.annotation, fragment_types=[FragmentType.ANNOTATION]))

        if self.label:
            out.append(SearchFilter(query=self.label, fragment_types=[FragmentType.LABEL]))

        return out


class SearchHitResponse(BaseModel):
    snippet: str
    page_number: int | None = None
    fragment_type: FragmentType
    score: float = Field(ge=0, le=1, description="Normalized relevance, higher = better")
    source_id: UUID | None = Field(default=None, exclude=True)
    annotation: AnnotationResponse | None = None
    field: str | None = None


class FileSearchResponse(BaseModel):
    file: FileResponse
    hits: list[SearchHitResponse]

    @computed_field
    @property
    def score(self) -> Literal["weak", "good", "strong"]:
        if not self.hits:
            return "good"
        best = max(h.score for h in self.hits)
        if best >= 0.85:
            return "strong"
        if best >= 0.7:
            return "good"
        return "weak"
