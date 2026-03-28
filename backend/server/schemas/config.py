from pydantic import BaseModel, computed_field


class AppStateResponse(BaseModel):
    is_initial_user_created: bool = False

    @computed_field
    @property
    def is_setup_complete(self) -> bool:
        """
        Check if the setup is complete
        """
        return self.is_initial_user_created
