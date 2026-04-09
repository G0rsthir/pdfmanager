from http import HTTPStatus
from urllib.parse import urlencode

from fastapi.responses import RedirectResponse


class SSOErrorRedirectResponse(RedirectResponse):
    def __init__(
        self,
        title: str = "An error occurred while processing the SSO request",
        description: str | None = None,
        error_code: int = 500,
    ) -> None:
        query_params = {
            "title": title,
            "error_code": f"{error_code} {HTTPStatus(error_code).phrase}",
        }
        if description:
            query_params["description"] = description

        super().__init__(f"/error?{urlencode(query_params)}")
