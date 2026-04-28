from fastapi import APIRouter

from server.const import TagEnum

from . import account, auth, identity, library, search, setup

api_router = APIRouter()
api_router.include_router(auth.router, tags=[TagEnum.AUTHENTICATION])
api_router.include_router(library.router, tags=[TagEnum.LIBRARY])
api_router.include_router(search.router, tags=[TagEnum.SEARCH])
api_router.include_router(setup.router, tags=[TagEnum.SETUP])
api_router.include_router(account.router, tags=[TagEnum.ACCOUNT])
api_router.include_router(identity.router, tags=[TagEnum.IDENTITY])
