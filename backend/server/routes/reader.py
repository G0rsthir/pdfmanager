from typing import Annotated

from fastapi import APIRouter, Path, Query, Response

from server.const import AccessScope
from server.dependencies import KoreaderSecurity
from server.schemas.security import AccessSessionContext

router = APIRouter(prefix="/reader")


KoreaderSession = Annotated[AccessSessionContext, KoreaderSecurity(scopes=[AccessScope.LIBRARY_SYNC])]


@router.get(path="/koreader/users/auth", operation_id="KoreaderAuth")
async def koreader_auth(access_session: KoreaderSession):
    return {"authorized": "OK"}


# @router.put(path="/koreader/syncs/progress", operation_id="KoreaderUpdateProgress", include_in_schema=False)
# async def koreader_update_progress(data: KoreaderProgressRequest, access_session: KoreaderSession):
#     pass


# @router.get(path="/koreader/syncs/progress/{document}", operation_id="KoreaderGetProgress", include_in_schema=False)
# async def koreader_get_progress(document: str, access_session: KoreaderSession):
#     pass
