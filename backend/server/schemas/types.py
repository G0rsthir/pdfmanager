from typing import Annotated

from pydantic import PlainSerializer

MaskedStr = Annotated[str, PlainSerializer(lambda value: "******" if value else "", return_type=str)]
