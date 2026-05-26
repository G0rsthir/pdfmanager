from collections import defaultdict
from dataclasses import dataclass, field
from uuid import UUID

from server.const import FragmentType
from server.infrastructure.search import SearchBackend
from server.repositories import AnnotationRepository, FileRepository
from server.schemas.search import EnrichedHit, FileSearchResult, SearchFilter


@dataclass(kw_only=True)
class SearchContext:
    hits_by_file: dict[UUID, list[EnrichedHit]] = field(default_factory=lambda: defaultdict(list))
    best_rank: dict[UUID, float] = field(default_factory=dict)
    matched_per_filter: list[set[UUID]] = field(default_factory=list)


class SearchService:
    def __init__(
        self,
        annotation_repo: AnnotationRepository,
        engine: SearchBackend,
        file_repo: FileRepository,
    ):
        self._annotations = annotation_repo
        self._engine = engine
        self._file_repo = file_repo

    async def search(self, doc_ids: list[UUID], filters: list[SearchFilter]) -> list[FileSearchResult]:
        if not doc_ids or not filters:
            return []

        context = await self._run_searches(doc_ids, filters)
        await self._attach_annotations(context.hits_by_file)

        # Require AND across filters: file must match every active search
        matched_ids = set.intersection(*context.matched_per_filter) if context.matched_per_filter else set()

        return [
            FileSearchResult(
                hits=self._dedupe_hits(context.hits_by_file[doc_id]),
                best_rank=context.best_rank[doc_id],
                doc_id=doc_id,
            )
            for doc_id in matched_ids
        ]

    async def _run_searches(self, doc_ids: list[UUID], filters: list[SearchFilter]) -> SearchContext:
        context = SearchContext()

        for filter in filters:
            if filter.fragment_types == [FragmentType.LABEL]:
                await self._run_label_filter(filter.query, doc_ids, context)
                continue

            await self._run_text_filter(filter, doc_ids, context)
        return context

    async def _run_text_filter(self, query: SearchFilter, doc_ids: list[UUID], context: SearchContext):

        result = await self._engine.search(
            query=query.query,
            doc_ids=doc_ids,
            fragment_types=query.fragment_types,
        )
        ids_here: set[UUID] = set()
        for hit in result.hits:
            context.hits_by_file[hit.doc_id].append(EnrichedHit(**hit.to_dict()))
            if hit.doc_id not in context.best_rank or hit.rank < context.best_rank[hit.doc_id]:
                context.best_rank[hit.doc_id] = hit.rank
            ids_here.add(hit.doc_id)
        context.matched_per_filter.append(ids_here)

    async def _run_label_filter(self, label: str, doc_ids: list[UUID], context: SearchContext):
        annotations = await self._annotations.list_by_label(label, doc_ids)
        ids_here: set[UUID] = set()
        EXACT_RANK = -100.0

        file_ids = {ann.file_id for ann in annotations.values() if ann.file_id in doc_ids}

        files = await self._file_repo.list_by_ids(list(file_ids))

        for ann in annotations.values():
            hit = EnrichedHit(
                doc_id=ann.file_id,
                entity_type=files[ann.file_id].name if ann.file_id in files else "unknown",
                fragment_type=FragmentType.ANNOTATION,
                source_id=ann.id,
                page_number=ann.page,
                snippet=ann.label or "",
                rank=EXACT_RANK,
                annotation=ann,
            )
            context.hits_by_file[ann.file_id].append(hit)
            cur = context.best_rank.get(ann.file_id)
            if cur is None or EXACT_RANK < cur:
                context.best_rank[ann.file_id] = EXACT_RANK
            ids_here.add(ann.file_id)

        context.matched_per_filter.append(ids_here)

    async def _attach_annotations(self, hits_by_file: dict[UUID, list[EnrichedHit]]):
        annotations_ids: set[UUID] = set()
        for hits in hits_by_file.values():
            for h in hits:
                if h.annotation is not None:
                    continue
                if h.source_id is None:
                    continue
                if h.fragment_type == FragmentType.ANNOTATION:
                    annotations_ids.add(h.source_id)

        annotations = await self._annotations.list_by_ids(list(annotations_ids))

        for hits in hits_by_file.values():
            for h in hits:
                if h.source_id is None:
                    continue
                if h.annotation is not None:
                    continue
                if h.fragment_type == FragmentType.ANNOTATION:
                    h.annotation = annotations.get(h.source_id)

    def _dedupe_hits(self, hits: list[EnrichedHit]) -> list[EnrichedHit]:
        best_by_key: dict[tuple[FragmentType, UUID], EnrichedHit] = {}
        passthrough: list[EnrichedHit] = []
        for h in hits:
            if h.source_id is None:
                passthrough.append(h)
                continue
            key = (h.fragment_type, h.source_id)
            existing = best_by_key.get(key)
            if existing is None or h.rank < existing.rank:
                best_by_key[key] = h
        return [*best_by_key.values(), *passthrough]
