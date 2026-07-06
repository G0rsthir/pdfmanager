from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from server.const import FragmentType
from server.infrastructure.search.interface import ContentFragment, SearchBackend, SearchHit, SearchResults
from server.infrastructure.search.query import TextQuery, parse_query

NO_MATCH = '""'


def _normalize_score(weighted_rank: float) -> float:
    r = max(0.0, -weighted_rank)
    return r / (1.0 + r)


def _quote(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def compile_fts5(query: TextQuery) -> str:
    positives: list[str] = []
    negatives: list[str] = []

    for t in query.terms:
        piece = _quote(t.value)
        #  phrase-prefix ("a b"*) is unsupported
        if t.prefix and not t.is_phrase:
            piece += "*"
        (negatives if t.negate else positives).append(piece)

    if not positives:
        # FTS5 needs at least one positive term
        return NO_MATCH

    expr = " ".join(positives)

    for n in negatives:
        expr += f" NOT {n}"

    return expr


class Fts5SearchBackend(SearchBackend):
    FRAGMENT_BOOST: dict[FragmentType, float] = {
        FragmentType.TITLE: 3.0,
        FragmentType.DESCRIPTION: 1.5,
        FragmentType.PAGE: 1.0,
        FragmentType.ANNOTATION: 2.0,
    }
    DEFAULT_BOOST = 1.0

    def __init__(self, session: AsyncSession):
        self.session = session

    def _boost_cases(self) -> str:
        cases = " ".join(f"WHEN '{fragment}' THEN {boost}" for fragment, boost in self.FRAGMENT_BOOST.items())
        return f"{cases} ELSE {self.DEFAULT_BOOST}"

    async def index(self, fragments: list[ContentFragment]) -> None:
        if not fragments:
            return

        for fragment in fragments:
            if not fragment.content.strip():
                continue
            await self.session.execute(
                text(
                    "INSERT INTO content_fts (content, doc_id, entity_type, page_number, fragment_type, source_id, field) "
                    "VALUES (:content, :doc_id, :entity_type, :page_number, :fragment_type, :source_id, :field)"
                ),
                {
                    "content": fragment.content,
                    "doc_id": str(fragment.doc_id),
                    "entity_type": fragment.entity_type,
                    "page_number": fragment.page_number,
                    "fragment_type": fragment.fragment_type,
                    "source_id": str(fragment.source_id) if fragment.source_id else None,
                    "field": fragment.field,
                },
            )
        await self.session.commit()

    async def delete_by_docs(self, doc_ids: list[UUID]) -> None:
        if not doc_ids:
            return

        stmt = text("DELETE FROM content_fts WHERE doc_id IN :doc_ids").bindparams(bindparam("doc_ids", expanding=True))
        await self.session.execute(stmt, {"doc_ids": [str(d) for d in doc_ids]})
        await self.session.commit()

    async def delete_fragments(self, doc_id: UUID, fragment_type: str):
        await self.session.execute(
            text("DELETE FROM content_fts WHERE doc_id = :doc_id AND fragment_type = :fragment_type"),
            {"doc_id": str(doc_id), "fragment_type": fragment_type},
        )
        await self.session.commit()

    async def delete_fragment_by_source(self, source_id: UUID):
        await self.session.execute(
            text("DELETE FROM content_fts WHERE source_id = :source_id"),
            {"source_id": str(source_id)},
        )
        await self.session.commit()

    async def search(
        self,
        query: str,
        doc_ids: list[UUID],
        fragment_types: list[FragmentType] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResults:
        match = compile_fts5(parse_query(query))
        if not doc_ids or match == NO_MATCH:
            return SearchResults(hits=[], total=0)

        where = ["content_fts MATCH :query", "doc_id IN :doc_ids"]
        params = {
            "query": match,
            "doc_ids": [str(d) for d in doc_ids],
            "limit": limit,
            "offset": offset,
        }
        binds: list = [bindparam("doc_ids", expanding=True)]

        if fragment_types:
            where.append("fragment_type IN :fragment_types")
            params["fragment_types"] = fragment_types
            binds.append(bindparam("fragment_types", expanding=True))

        where_clause = " AND ".join(where)

        count_result = await self.session.execute(
            text(f"SELECT COUNT(*) FROM content_fts WHERE {where_clause}").bindparams(*binds),
            params,
        )
        total = count_result.scalar() or 0

        results = await self.session.execute(
            text(
                f"SELECT doc_id, entity_type, page_number, fragment_type, source_id, field, "
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
                    doc_id=UUID(row.doc_id),
                    entity_type=row.entity_type,
                    page_number=row.page_number,
                    fragment_type=row.fragment_type,
                    snippet=row.snippet,
                    score=_normalize_score(row.weighted_rank),
                    source_id=UUID(row.source_id) if row.source_id else None,
                    field=row.field,
                )
                for row in results
            ],
            total=total,
        )
