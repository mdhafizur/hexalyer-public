from typing import Optional, Dict, Union
from datetime import datetime
from pydantic import BaseModel, Field, ValidationError, validator
from enum import Enum
from models.base import PyObjectId  # Assuming this exists
from bson.objectid import ObjectId


class ReportType(str, Enum):
    """
    Enum for defining the type of report.
    """
    MANUAL = "manual"
    WEBHEX = "webhex"
    AUTOMATIC = "automatic"


class ReportModel(BaseModel):
    """
    Pydantic model representing a report entity.
    """

    id: PyObjectId = Field(
        ...,
        description="MongoDB ObjectId",
        alias="_id",
        example="64309628d1cd938d5163ad52",
    )
    type: ReportType = Field(
        ...,
        description="Type of report",
        example="webhex"
    )
    user_id: PyObjectId = Field(
        ...,
        description="ID of the user associated with the report",
        example="64309628d1cd938d5163ad50",  # Example ObjectId as a string
    )
    url: str = Field(
        ...,
        description="URL of the website associated with the report",
        example="https://hexalayer.github.io",  # Example ObjectId as a string
    )
    details: Optional[Dict[str, Union[str, Dict]]] = Field(
        default_factory=dict,
        description="Additional details about the report",
        example={"key": "value"},
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the report was created",
        example="2024-12-01T12:00:00Z",
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the report was last updated",
        example="2024-12-01T12:10:00Z",
    )

    @validator("id", pre=True, always=True)
    def validate_objectid(cls, value):
        """
        Validate or convert a string to PyObjectId.
        """
        if isinstance(value, str):
            try:
                return PyObjectId(value)
            except ValueError:
                raise ValueError(f"Invalid ObjectId: {value}")
        if not isinstance(value, PyObjectId):
            raise ValueError("Invalid ObjectId format.")
        return value

    def dict(self, **kwargs):
        """
        Override `dict` to properly serialize `_id` and datetime fields.
        """
        kwargs["by_alias"] = True
        data = super().dict(**kwargs)

        # Serialize ObjectIds as strings
        if "_id" in data and isinstance(data["_id"], ObjectId):
            data["_id"] = str(data["_id"])

        # Serialize datetime fields to ISO 8601 format
        for field in ["created_at", "updated_at"]:
            if field in data and isinstance(data[field], datetime):
                data[field] = data[field].isoformat()

        return data

    def json(self, **kwargs):
        """
        Override `json` to ensure proper serialization of `_id` and datetime fields.
        """
        kwargs["by_alias"] = True
        return super().json(**kwargs)

    class Config:
        """
        Configuration for the Pydantic model.
        """
        from_attributes = True
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        json_schema_extra = {
            "example": {
                "id": "64309628d1cd938d5163ad52",
                "type": "webhex",
                "user_id": "64309628d1cd938d51sa221d",
                "url": "https://hexalayer.github.io",
                "details": {"key": "value"},
                "created_at": "2024-12-01T12:00:00Z",
                "updated_at": "2024-12-01T12:10:00Z",
            }
        }
