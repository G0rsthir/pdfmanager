from pydantic import BaseModel, ConfigDict, StrictStr


class DetailsUpdate(BaseModel):
    model_config = ConfigDict(str_max_length=255, str_min_length=1)

    email: StrictStr
    name: str
