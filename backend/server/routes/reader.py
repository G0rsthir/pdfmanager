from datetime import datetime
from typing import Annotated

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from server.const import AccessScope
from server.dependencies import KoreaderSecurity, LibraryServiceDependency, ReaderServiceDependency
from server.exceptions import LibraryFileNotFoundError
from server.schemas.reader import KoreaderProgress, KoreaderProgressResponse, KoreaderProgressResult
from server.schemas.security import AccessSessionContext

router = APIRouter(prefix="/reader")


KoreaderSession = Annotated[AccessSessionContext, KoreaderSecurity(scopes=[AccessScope.LIBRARY_SYNC])]


@router.get(path="/koreader", operation_id="KoreaderBase", include_in_schema=False)
async def koreader_base(access_session: KoreaderSession):
    """
    Base endpoint for Koreader
    """
    return


@router.get(path="/koreader/users/auth", operation_id="KoreaderAuth", include_in_schema=False)
async def koreader_auth(access_session: KoreaderSession):
    return JSONResponse({"authorized": "OK"})


@router.put(
    path="/koreader/syncs/progress",
    operation_id="KoreaderUpdateProgress",
    response_model=KoreaderProgressResult,
    include_in_schema=False,
)
async def koreader_update_progress(
    data: KoreaderProgress,
    access_session: KoreaderSession,
    library_service: LibraryServiceDependency,
    reader_service: ReaderServiceDependency,
):

    file = await reader_service.resolve_koreader_file(user_id=access_session.user_id, document=data.document)

    if not file:
        raise LibraryFileNotFoundError(identifier=data.document, msg="Hash not found in library")

    await library_service.patch_file_state(
        file_id=file.id,
        user_id=access_session.user_id,
        current_page=int(data.progress),
    )

    return KoreaderProgressResult(document=data.document, timestamp=int(datetime.now().timestamp()))


@router.get(
    path="/koreader/syncs/progress/{document}",
    operation_id="KoreaderGetProgress",
    include_in_schema=False,
    response_model=KoreaderProgressResponse | dict,
)
async def koreader_get_progress(
    document: str,
    access_session: KoreaderSession,
    reader_service: ReaderServiceDependency,
    library_service: LibraryServiceDependency,
):
    file = await reader_service.resolve_koreader_file(user_id=access_session.user_id, document=document)

    if not file:
        return {}

    details = await library_service.get_file(user_id=access_session.user_id, file_id=file.id)

    if not details.state or not details.state.last_read_at:
        return {}

    return KoreaderProgressResponse(
        document=document,
        device_id="pdf_manager",
        device="PDF Manager",
        percentage=details.state.current_page / details.file.page_count,
        progress=str(details.state.current_page),
        timestamp=int(details.state.last_read_at.timestamp()),
    )
