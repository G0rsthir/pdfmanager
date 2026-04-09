from pydantic import BaseModel, Field, computed_field


class SsoConfigResponse(BaseModel):
    url: str
    is_auto_login_enabled: bool
    name: str


class AppStateResponse(BaseModel):
    is_initial_user_created: bool = False
    sso_servers: list[SsoConfigResponse] = Field(default_factory=list)
    auto_login_sso_server: SsoConfigResponse | None = None

    @computed_field
    @property
    def is_setup_complete(self) -> bool:
        """
        Check if the setup is complete
        """
        return self.is_initial_user_created
