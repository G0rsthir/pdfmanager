from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Query

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    LibraryServiceDependency,
    SearchEngineDependency,
)
from server.routes._assemblers import build_file_response
from server.schemas.search import FileSearchResponse, SearchFilesQueryParams, SearchHitResponse
from server.schemas.security import AccessSessionContext

router = APIRouter(prefix="/search")


@router.get(path="/files", response_model=list[FileSearchResponse], operation_id="SearchFiles")
async def search_files(
    query: Annotated[SearchFilesQueryParams, Query()],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    search_engine: SearchEngineDependency,
    library_service: LibraryServiceDependency,
):

    files_with_details = await library_service.list_files(
        user_id=access_session.user_id,
        tags=query.tags,
        name=query.name,
        description=query.description,
    )

    if not files_with_details:
        return []

    file_map = {str(f.file.id): f for f in files_with_details}
    searches = query.searches()

    if not searches:
        return [
            FileSearchResponse(file=build_file_response(f, user_id=access_session.user_id), hits=[])
            for f in files_with_details
        ]

    doc_ids = [f.file.id for f in files_with_details]
    hits_by_file: dict[str, list[SearchHitResponse]] = defaultdict(list)
    best_rank: dict[str, float] = {}
    matched_per_filter: list[set[str]] = []

    for q_text, fragment_types in searches:
        result = await search_engine.search(
            query=q_text,
            doc_ids=doc_ids,
            fragment_types=fragment_types,
        )
        ids_here: set[str] = set()
        for hit in result.hits:
            hits_by_file[hit.doc_id].append(
                SearchHitResponse(
                    snippet=hit.snippet,
                    page_number=hit.page_number,
                    fragment_type=hit.fragment_type,
                    rank=hit.rank,
                )
            )
            if hit.doc_id not in best_rank or hit.rank < best_rank[hit.doc_id]:
                best_rank[hit.doc_id] = hit.rank
            ids_here.add(hit.doc_id)
        matched_per_filter.append(ids_here)

    # AND across filters: file must match every active search
    matched_ids = sorted(set.intersection(*matched_per_filter), key=lambda fid: best_rank[fid])

    return [
        FileSearchResponse(
            file=build_file_response(file_map[fid], user_id=access_session.user_id),
            hits=hits_by_file[fid],
        )
        for fid in matched_ids
        if fid in file_map
    ]
