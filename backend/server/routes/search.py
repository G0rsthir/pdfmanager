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

    if not query.text:
        return [FileSearchResponse(file=build_file_response(file), hits=[]) for file in files_with_details]

    result = await search_engine.search(
        query=query.text,
        doc_ids=[file.file.id for file in files_with_details],
    )

    # Group hits by file, track best rank per file
    file_map = {str(file.file.id): file for file in files_with_details}
    hits_by_file: dict[str, list[SearchHitResponse]] = defaultdict(list)
    best_rank: dict[str, float] = {}

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

    # Build response sorted by best rank (lower = better)
    matched_ids = sorted(hits_by_file.keys(), key=lambda file_id: best_rank[file_id])

    return [
        FileSearchResponse(
            file=build_file_response(file_map[file_id]),
            hits=hits_by_file[file_id],
        )
        for file_id in matched_ids
        if file_id in file_map
    ]
