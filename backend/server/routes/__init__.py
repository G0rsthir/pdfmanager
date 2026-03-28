from fastapi import APIRouter

from server.const import TagEnum

from . import auth, library, setup

api_router = APIRouter()
api_router.include_router(auth.router, tags=[TagEnum.AUTHENTICATION])
api_router.include_router(library.router, tags=[TagEnum.LIBRARY])
api_router.include_router(setup.router, tags=[TagEnum.SETUP])
