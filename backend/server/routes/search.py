from typing import Annotated

from fastapi import APIRouter, Query

from server.const import ScopesEnum
from server.dependencies import (
    AccessSecurity,
    LibraryServiceDependency,
    SearchServiceDependency,
)
from server.routes._assemblers import build_file_response
from server.schemas.search import FileSearchResponse, SearchFilesQueryParams, SearchHitResponse
from server.schemas.security import AccessSessionContext

router = APIRouter(prefix="/search")


@router.get(path="/files", response_model=list[FileSearchResponse], operation_id="SearchFiles")
async def search_files(
    query: Annotated[SearchFilesQueryParams, Query()],
    access_session: Annotated[AccessSessionContext, AccessSecurity(scopes=[ScopesEnum.USER_READ])],
    library_service: LibraryServiceDependency,
    search_service: SearchServiceDependency,
):
    files = await library_service.list_files(
        user_id=access_session.user_id,
        tags=query.tags,
        name=query.name,
        description=query.description,
    )
    if not files:
        return []

    filters = query.filters()
    if not filters:
        return [FileSearchResponse(file=build_file_response(f, user_id=access_session.user_id), hits=[]) for f in files]

    result = await search_service.search(
        doc_ids=[f.file.id for f in files],
        filters=filters,
    )

    file_map = {f.file.id: f for f in files}
    ordered_results = sorted(result, key=lambda r: r.best_rank)
    return [
        FileSearchResponse(
            file=build_file_response(file_map[r.doc_id], user_id=access_session.user_id),
            hits=[SearchHitResponse(**h.to_dict()) for h in r.hits],
        )
        for r in ordered_results
        if r.doc_id in file_map
    ]
