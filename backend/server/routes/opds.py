from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path, Query, Response
from fastapi.responses import FileResponse as FastAPIFileResponse

from server.const import AccessScopeEnum
from server.dependencies import BasicAuthSecurity, LibraryServiceDependency, OpdsCatalogServiceDependency
from server.routes._assemblers import build_opds_opensearch_response, build_opds_response
from server.schemas.security import AccessSessionContext

router = APIRouter(prefix="/opds")


# TODO (maybe)
# Pagination: rel="next" / "previous"
# Facets: Tags
# Drafts: General support - Authentication, Progression https://drafts.opds.io/


@router.get(path="/", operation_id="OpdsRoot")
async def get_opds_root(
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    opds_service: OpdsCatalogServiceDependency,
) -> Response:
    return build_opds_response(opds_service.root_feed())


@router.get(path="/all", operation_id="OpdsAll")
async def get_opds_all_files(
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    opds_service: OpdsCatalogServiceDependency,
) -> Response:

    return build_opds_response(await opds_service.get_all_files_feed(user_id=access_session.user_id))


@router.get(path="/opensearch.xml", operation_id="OpdsOpenSearch")
async def get_opds_opensearch(
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    opds_service: OpdsCatalogServiceDependency,
) -> Response:

    return build_opds_opensearch_response(opds_service.opensearch_description())


@router.get(path="/search", operation_id="OpdsSearch")
async def get_opds_search(
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    opds_service: OpdsCatalogServiceDependency,
    q: Annotated[str, Query()] = "",
) -> Response:
    return build_opds_response(await opds_service.get_search_feed(user_id=access_session.user_id, query=q))


@router.get(path="/shelf", operation_id="OpdsShelf")
async def get_opds_shelf(
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    opds_service: OpdsCatalogServiceDependency,
) -> Response:
    return build_opds_response(await opds_service.get_shelf_feed(user_id=access_session.user_id))


@router.get(path="/collections", operation_id="OpdsCollections")
async def get_opds_collections(
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    opds_service: OpdsCatalogServiceDependency,
) -> Response:
    return build_opds_response(await opds_service.get_ollections_feed(user_id=access_session.user_id))


@router.get(path="/collections/{collection_id}", operation_id="OpdsCollection")
async def get_opds_collection(
    collection_id: Annotated[UUID, Path()],
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    opds_service: OpdsCatalogServiceDependency,
) -> Response:

    return build_opds_response(
        await opds_service.collection_feed(user_id=access_session.user_id, collection_id=collection_id)
    )


# Path must include file type. Readers append the file extension to the acquisition URL
@router.get(path="/file/{id}.{ext}", response_class=FastAPIFileResponse, operation_id="GetOpdsFile")
async def download_opds_file(
    file_id: Annotated[UUID, Path(alias="id")],
    ext: Annotated[str, Path()],
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    library_service: LibraryServiceDependency,
) -> FastAPIFileResponse:

    view = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)

    async with library_service.open_file(view.file.storage_key) as path:
        return FastAPIFileResponse(
            path,
            media_type=view.file.content_type,
            # TODO use original file name
            filename=view.file.name,
        )


@router.get(path="/file/{id}/thumbnail", response_class=FastAPIFileResponse, operation_id="GetOpdsFileThumbnail")
async def download_opds_thumbnail(
    file_id: Annotated[UUID, Path(alias="id")],
    access_session: Annotated[AccessSessionContext, BasicAuthSecurity(scopes=[AccessScopeEnum.USER_READ])],
    library_service: LibraryServiceDependency,
) -> FastAPIFileResponse:

    view = await library_service.get_file(user_id=access_session.user_id, file_id=file_id)

    async with library_service.open_file(view.file.thumbnail) as path:
        return FastAPIFileResponse(path, media_type=view.file.thumbnail_content_type)
