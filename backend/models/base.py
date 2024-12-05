from typing import List, Generic, TypeVar, Optional
from bson.objectid import ObjectId
from pydantic import BaseModel, ValidationInfo


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, value, _: ValidationInfo):
        if not ObjectId.is_valid(value):
            raise ValueError(f"Invalid ObjectId: {value}")
        return ObjectId(value)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema):
        schema.update(type="string")


T = TypeVar("T")


class PaginatedResponseModel(BaseModel, Generic[T]):
    """
    A generic model for paginated responses.
    """

    page: int
    page_size: int
    total_items: int
    total_pages: int
    data: List[T]

    class Config:
        """
        Pydantic configuration for JSON schema generation.
        """

        json_schema_extra = {
            "example": {
                "page": 1,
                "page_size": 10,
                "total_items": 100,
                "total_pages": 10,
                "data": [],
            }
        }
