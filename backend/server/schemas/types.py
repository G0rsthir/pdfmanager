from typing import Annotated, Any

from pydantic import AfterValidator, Field, PlainSerializer
from pydantic.json_schema import SkipJsonSchema

from server.const import AccessScope
from server.schemas._validation import unique_scopes

MaskedStr = Annotated[str, PlainSerializer(lambda value: "******" if value else "", return_type=str)]

# Allows to remove an inherited field from a model
ExcludedField = SkipJsonSchema[Annotated[Any, Field(default=None, exclude=True), AfterValidator(lambda s: None)]]

type ScopeList = Annotated[list[AccessScope], AfterValidator(unique_scopes)]
type RequiredScopeList = Annotated[ScopeList, Field(min_length=1)]
