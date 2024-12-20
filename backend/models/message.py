from typing import Optional, Dict, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum
from models.base import PyObjectId  # Assuming this exists
from bson.objectid import ObjectId


class MessageType(str, Enum):
    MANUAL = "manual"
    WEBHEX = "webhex"
    AUTOMATIC = "automatic"


class MessageModel(BaseModel):
    """
    Pydantic model representing a message entity.
    """

    id: PyObjectId = Field(
        ...,
        description="MongoDB ObjectId",
        alias="_id",
        example="64309628d1cd938d5163ad52",
    )
    conversation_id: PyObjectId = Field(
        ...,
        description="ID of the conversation this message belongs to",
        example="64309628d1cd938d5163ad49",
    )
    sender: str = Field(
        ..., description="Sender of the message, either 'user' or 'ai'", example="user"
    )
    content: str = Field(
        ...,
        description="Text content of the message",
        example="Hello, how can I help you?",
    )
    type: Optional[MessageType] = Field(
        ..., description="Type of conversation", example="webhex"
    )
    details: Optional[Dict[str, Union[str, Dict]]] = Field(
        ...,
        description="Details field containing additional data",
        example={"scanId": 1, "url": "https://example.com", "report": {}},
    )
    created_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the message was created",
        example="2024-12-01T12:00:00Z",
    )
    updated_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the message was last updated",
        example="2024-12-01T12:10:00Z",
    )

    @validator("id", "conversation_id", pre=True)
    def validate_objectid(cls, value):
        """
        Convert string fields to PyObjectId during validation.
        """
        if isinstance(value, str):
            try:
                return PyObjectId(value)
            except ValueError:
                raise ValueError(f"Invalid ObjectId: {value}")
        return value

    def dict(self, **kwargs):
        """
        Override `dict` to ensure `_id` and `conversation_id` are properly converted.
        """
        kwargs["by_alias"] = True
        data = super().dict(**kwargs)

        # Serialize ObjectIds as strings
        if "_id" in data and isinstance(data["_id"], ObjectId):
            data["_id"] = str(data["_id"])
        if "conversation_id" in data and isinstance(data["conversation_id"], ObjectId):
            data["conversation_id"] = str(data["conversation_id"])

        # Serialize datetime fields to ISO 8601 format
        if "created_at" in data and isinstance(data["created_at"], datetime):
            data["created_at"] = data["created_at"].isoformat()
        if "updated_at" in data and isinstance(data["updated_at"], datetime):
            data["updated_at"] = data["updated_at"].isoformat()

        return data

    def json(self, **kwargs):
        """
        Override `json` to ensure `_id` and datetime fields are serialized correctly.
        """
        kwargs["by_alias"] = True
        return super().json(**kwargs)

    class Config:
        """
        Pydantic configuration for JSON encoding and schema generation.
        """
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        json_schema_extra = {
            "example": {
                "id": "64309628d1cd938d5163ad52",
                "conversation_id": "64309628d1cd938d5163ad49",
                "sender": "user",
                "content": "Hello, how can I help you?",
                "type": "webhex",
                "details": {"scanId": 1, "url": "https://example.com", "report": {}},
                "created_at": "2024-12-01T12:00:00+00:00",
                "updated_at": "2024-12-01T12:10:00+00:00",
            }
        }
