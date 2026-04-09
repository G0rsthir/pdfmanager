from fastapi import Request

from server.models import ORMAuthProviderOidc
from server.schemas.identity import AuthProviderOidcResponse


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
