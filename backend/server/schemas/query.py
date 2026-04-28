from collections.abc import Sequence
from dataclasses import dataclass

from pydantic import BaseModel, Field, computed_field


@dataclass(frozen=True, kw_only=True)
class PaginatedResult[T]:
    items: list[T]
    total: int


class PaginationQueryParams(BaseModel):
    page_index: int = Field(default=1, ge=1, description="Page index")
    page_size: int = Field(default=10, ge=1, le=999, description="Number of items per page")

    @computed_field
    @property
    def offset(self) -> int:
        return self.page_size * (self.page_index - 1)

    @computed_field
    @property
    def limit(self) -> int:
        return self.page_size


class PaginatedResponse[DataT](BaseModel):
    """
    Generic paginated response
    """

    results: Sequence[DataT]
    row_count: int
    page_size: int
    page_count: int
    page_index: int = 1

    @classmethod
    def from_result(cls, query: PaginationQueryParams, result: PaginatedResult[DataT]):
        return cls.from_list(query=query, result=result.items, total=result.total)

    @classmethod
    def from_tuple(cls, query: PaginationQueryParams, result: tuple[Sequence[DataT], int]):
        items, total = result
        return cls.from_list(query=query, result=items, total=total)

    @classmethod
    def from_list(cls, query: PaginationQueryParams, result: Sequence[DataT], total: int):
        page_count = (total + query.page_size - 1) // query.page_size

        return cls(
            results=result,
            row_count=total,
            page_size=query.page_size,
            page_count=page_count if page_count > 0 else 1,
            page_index=query.page_index,
        )
