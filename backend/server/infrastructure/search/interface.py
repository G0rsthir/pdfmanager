from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

from server.const import FragmentType
from server.infrastructure.utils import Entity


@dataclass(kw_only=True)
class ContentFragment:
    content: str
    doc_id: UUID
    entity_type: str  # Same as content_type
    fragment_type: FragmentType
    page_number: int | None = None
    source_id: UUID | None = None
    field: str | None = None


@dataclass(kw_only=True)
class SearchHit(Entity):
    doc_id: UUID
    snippet: str
    # Normalized relevance in [0, 1], higher = better
    score: float
    entity_type: str
    fragment_type: FragmentType
    page_number: int | None = None
    source_id: UUID | None = None
    field: str | None = None


@dataclass(kw_only=True)
class SearchResults:
    hits: list[SearchHit]
    total: int


class SearchBackend(ABC):
    @abstractmethod
    async def index(self, fragments: list[ContentFragment]):
        pass

    @abstractmethod
    async def delete_by_docs(self, doc_ids: list[UUID]):
        pass

    @abstractmethod
    async def delete_fragments(self, doc_id: UUID, fragment_type: FragmentType):
        pass

    @abstractmethod
    async def delete_fragment_by_source(self, source_id: UUID):
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        doc_ids: list[UUID],
        fragment_types: list[FragmentType] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResults:
        pass
