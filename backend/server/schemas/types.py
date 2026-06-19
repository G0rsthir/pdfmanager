from typing import Annotated, Any

from pydantic import AfterValidator, Field, PlainSerializer, RootModel, model_validator
from pydantic.json_schema import SkipJsonSchema

MaskedStr = Annotated[str, PlainSerializer(lambda value: "******" if value else "", return_type=str)]

# Allows to remove an inherited field from a model
ExcludedField = SkipJsonSchema[Annotated[Any, Field(default=None, exclude=True), AfterValidator(lambda s: None)]]


class Scopes(RootModel):
    root: list[str]

    def __iter__(self):  # type: ignore
        return iter(self.root)

    def __getitem__(self, item):
        return self.root[item]

    def __contains__(self, item: object) -> bool:
        return isinstance(item, str) and item in self.root

    def __str__(self) -> str:
        return " ".join(self.root)

    def to_list(self) -> list[str]:
        return self.root

    def to_str(self) -> str:
        return " ".join(self.root)

    @model_validator(mode="before")
    @classmethod
    def split_string(cls, value):
        if isinstance(value, str):
            return [s.strip() for s in value.split(" ") if s.strip()]
        return value

    @classmethod
    def from_str(cls, scopes_str: str):
        return cls(root=scopes_str.split(" "))
