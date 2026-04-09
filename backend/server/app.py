from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from server.const import EnvironmentsEnum
from server.exception_handlers import exception_handlers
from server.runtime import RuntimeContainer
from server.security.loader import create_auth_managers

from .routes import api_router


def create_http_server(app_context: RuntimeContainer, **kwargs) -> FastAPI:
    debug = False

    if app_context.env.ENVIRONMENT == EnvironmentsEnum.DEVELOPMENT:
        debug = True

    app = FastAPI(
        title="API Documentation",
        debug=debug,
        docs_url="/api/v1/docs" if debug else None,
        redoc_url="/api/v1/redoc" if debug else None,
        openapi_url="/api/v1/openapi.json" if debug else None,
        exception_handlers=exception_handlers,
    )

    access_manager, refresh_manager = create_auth_managers(
        access_jwt_secret=app_context.env.ACCESS_JWT_SECRET,
        refresh_jwt_secret=app_context.env.REFRESH_JWT_SECRET,
    )

    app.state.env = app_context.env
    app.state.app_context = app_context

    app.state.access_manager = access_manager
    app.state.refresh_manager = refresh_manager

    # Required by Authlib
    app.add_middleware(
        SessionMiddleware,
        secret_key=app_context.env.ACCESS_JWT_SECRET,
        same_site="lax",  # Strict cookie won't work with OIDC
        https_only=True,
    )

    app.include_router(api_router, prefix="/api/v1")

    return app
