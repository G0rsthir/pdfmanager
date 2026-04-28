from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(kw_only=True)
class ContentFragment:
    content: str
    doc_id: UUID
    entity_type: str
    fragment_type: str
    page_number: int | None = None


@dataclass(kw_only=True)
class SearchHit:
    doc_id: str
    snippet: str
    rank: float
    entity_type: str
    fragment_type: str
    page_number: int | None = None


@dataclass(kw_only=True)
class SearchResults:
    hits: list[SearchHit]
    total: int


class SearchBackend(ABC):
    @abstractmethod
    async def index(self, fragments: list[ContentFragment]):
        pass

    @abstractmethod
    async def delete_by_docs(self, doc_id: list[UUID]):
        pass

    @abstractmethod
    async def delete_fragments(self, doc_id: UUID, fragment_type: str):
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        doc_ids: list[UUID],
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResults:
        pass


class Fts5SearchBackend(SearchBackend):
    # Lower rank == better
    FRAGMENT_BOOST: dict[str, float] = {
        "title": 0.3,
        "description": 0.5,
        "page": 1.0,
    }
    DEFAULT_BOOST = 1.0

    def __init__(self, session: AsyncSession):
        self.session = session

    def _boost_cases(self) -> str:
        cases = " ".join(f"WHEN '{fragment}' THEN {boost}" for fragment, boost in self.FRAGMENT_BOOST.items())
        return f"{cases} ELSE {self.DEFAULT_BOOST}"

    async def index(self, fragments: list[ContentFragment]) -> None:
        for fragment in fragments:
            if not fragment.content.strip():
                continue
            await self.session.execute(
                text(
                    "INSERT INTO content_fts (content, doc_id, entity_type, page_number, fragment_type) "
                    "VALUES (:content, :doc_id, :entity_type, :page_number, :fragment_type)"
                ),
                {
                    "content": fragment.content,
                    "doc_id": str(fragment.doc_id),
                    "entity_type": fragment.entity_type,
                    "page_number": fragment.page_number,
                    "fragment_type": fragment.fragment_type,
                },
            )
        await self.session.commit()

    async def delete_by_docs(self, doc_ids: list[UUID]) -> None:
        if not doc_ids:
            return

        stmt = text("DELETE FROM content_fts WHERE doc_id IN :doc_ids").bindparams(bindparam("doc_ids", expanding=True))
        await self.session.execute(stmt, {"doc_ids": [str(d) for d in doc_ids]})
        await self.session.commit()

    async def delete_fragments(self, doc_id: UUID, fragment_type: str) -> None:
        await self.session.execute(
            text("DELETE FROM content_fts WHERE doc_id = :doc_id AND fragment_type = :fragment_type"),
            {"doc_id": str(doc_id), "fragment_type": fragment_type},
        )
        await self.session.commit()

    async def search(
        self,
        query: str,
        doc_ids: list[UUID],
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResults:
        where = ["content_fts MATCH :query"]
        params = {"query": query, "limit": limit, "offset": offset}
        binds: list = []

        if not doc_ids:
            return SearchResults(hits=[], total=0)

        where.append("doc_id IN :doc_ids")
        params["doc_ids"] = [str(d) for d in doc_ids]
        binds.append(bindparam("doc_ids", expanding=True))

        where_clause = " AND ".join(where)

        count_result = await self.session.execute(
            text(f"SELECT COUNT(*) FROM content_fts WHERE {where_clause}").bindparams(*binds),
            params,
        )
        total = count_result.scalar() or 0

        results = await self.session.execute(
            text(
                f"SELECT doc_id, entity_type, page_number, fragment_type, "
                f"snippet(content_fts, 0, '<mark>', '</mark>', '...', 40) as snippet, "
                f"rank * CASE fragment_type {self._boost_cases()} END as weighted_rank "
                f"FROM content_fts "
                f"WHERE {where_clause} "
                f"ORDER BY weighted_rank "
                f"LIMIT :limit OFFSET :offset"
            ).bindparams(*binds),
            params,
        )

        return SearchResults(
            hits=[
                SearchHit(
                    doc_id=row.doc_id,
                    entity_type=row.entity_type,
                    page_number=row.page_number,
                    fragment_type=row.fragment_type,
                    snippet=row.snippet,
                    rank=row.weighted_rank,
                )
                for row in results
            ],
            total=total,
        )
