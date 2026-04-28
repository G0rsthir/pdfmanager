from fastapi import Request

from server.models import ORMAuthProviderOidc
from server.repositories import FileWithDetails
from server.schemas.identity import AuthProviderOidcResponse
from server.schemas.library import FileResponse, FileStateResponse, TagResponse


def build_oidc_provider_response(provider: ORMAuthProviderOidc, request: Request) -> AuthProviderOidcResponse:
    """
    Adds additional attributes to the AuthProviderOIDCResponse
    """

    response = AuthProviderOidcResponse(
        **provider.__dict__,
        redirect_url=str(request.url_for("oidc_callback", id=provider.id)),
        authorize_url=str(request.url_for("oidc_authorize", id=provider.id)),
    )

    return response


def build_file_response(file_details: FileWithDetails) -> FileResponse:
    return FileResponse(
        **file_details.file.__dict__,
        state=FileStateResponse.model_validate(file_details.state)
        if file_details.state
        else FileStateResponse.with_defaults(),
        tags=[TagResponse.model_validate(tag) for tag in file_details.tags],
    )
