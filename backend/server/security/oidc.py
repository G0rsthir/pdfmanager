from authlib.integrations.starlette_client import OAuth, StarletteOAuth2App
from fastapi import Request

from server.exceptions import OAuthError
from server.models import ORMAuthProviderOidc
from server.schemas.security import OidcAuthResult, OidcUser


class OidcClient:
    def __init__(self, config: ORMAuthProviderOidc):
        self.config = config
        self.client = self._create_client()

    async def authorize_redirect(self, request: Request, redirect_url: str):
        return await self.client.authorize_redirect(request, redirect_url)

    async def authorize_access_token(self, request: Request) -> OidcAuthResult:
        token = await self.client.authorize_access_token(request)

        user_info = token.get("userinfo")
        if not user_info:
            raise OAuthError("OIDC response missing user info")

        self._validate_scopes(current_scopes=token.get("scope"))
        user = self._map_user_info(user_info)

        return OidcAuthResult(token=token, user_info=user_info, user=user)

    async def get_end_session_endpoint(self) -> str | None:
        try:
            metadata = await self.client.load_server_metadata()
            return metadata.get("end_session_endpoint") or None
        except Exception:
            return None

    def _create_client(self) -> StarletteOAuth2App:

        if not self.config.is_valid:
            raise OAuthError("OIDC provider configuration is invalid")

        oauth = OAuth()
        oauth.register(
            name="oidc",
            client_cls=StarletteOAuth2App,
            client_id=self.config.client_id,
            client_secret=self.config.client_secret,
            server_metadata_url=self.config.auto_discovery_url,
            client_kwargs={
                "scope": self.config.required_scope_list_str,
            },
        )

        client = oauth.create_client("oidc")
        if not client:
            raise OAuthError("Failed to create OIDC client")

        return client

    def _validate_scopes(self, current_scopes: str | list[str] | None):
        if not current_scopes:
            raise OAuthError("OIDC response does not contain required scopes")
        if isinstance(current_scopes, str):
            current_scopes = current_scopes.split(" ")

        for scope in self.config.required_scope_list:
            if scope not in current_scopes:
                raise OAuthError(f"OIDC response missing required scope: '{scope}'")

    def _map_user_info(self, user_info: dict) -> OidcUser:
        if "sub" not in user_info:
            raise OAuthError("OIDC user info missing 'sub'")

        if "email" not in user_info:
            raise OAuthError("OIDC user info missing 'email'")

        group_claim = self.config.group_claim_name
        if group_claim not in user_info:
            raise OAuthError(f"OIDC user info missing group claim: '{group_claim}'")

        groups = user_info[group_claim]
        if isinstance(groups, str):
            groups = [groups]

        return OidcUser(
            name=user_info.get("name")
            or user_info.get("preferred_username")
            or user_info["email"].split("@")[0].replace(".", " ").title(),
            email=user_info["email"],
            groups=groups,
            subject=user_info["sub"],
            session_id=user_info.get("sid"),
        )
