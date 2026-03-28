from collections.abc import Callable, Coroutine
from typing import Any, Union

from fastapi import Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from server.exceptions import AuthenticationError, DomainError, FieldError, FieldValidationErrors


def build_field_error_detail(
    field: str,
    msg: str,
    loc_prefix: str | None = "body",
):
    loc = []
    if loc_prefix is not None:
        loc.append(loc_prefix)

    if "." in field:
        loc.extend(field.split("."))
    else:
        loc.append(field)

    return {"type": "value_error", "loc": loc, "msg": msg, "input": [], "ctx": {"error": {}}}


async def authentication_handler(request: Request, exc: AuthenticationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED, content=jsonable_encoder({"detail": "Invalid username or password"})
    )


async def field_error_handler(request: Request, exc: FieldError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=jsonable_encoder({"detail": [build_field_error_detail(field=exc.field, msg=exc.msg)]}),
    )


async def validation_error_handler(request: Request, exc: FieldValidationErrors):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=jsonable_encoder(
            {"detail": [build_field_error_detail(field=error.field, msg=error.msg) for error in exc.errors]}
        ),
    )


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content=jsonable_encoder({"detail": str(exc)}))


# Custom exception handlers
exception_handlers: dict[Union[int, type[Exception]], Callable[[Request, Any], Coroutine[Any, Any, Response]]] = {
    AuthenticationError: authentication_handler,
    FieldError: field_error_handler,
    FieldValidationErrors: validation_error_handler,
    DomainError: domain_error_handler,
}
