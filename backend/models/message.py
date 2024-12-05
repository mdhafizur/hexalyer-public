# models/message.py

from typing import Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, ValidationError, model_validator
from models.base import PyObjectId  # Assuming this exists, as in the ConversationModel


class SenderEnum(str, Enum):
    """
    Enum for message sender type.
    """

    user = "user"
    ai = "ai"


class MessageModel(BaseModel):
    """
    Pydantic model representing a message entity.
    """

    id: PyObjectId = Field(
        default_factory=PyObjectId, alias="_id", description="MongoDB ObjectId"
    )
    conversation_id: PyObjectId = Field(
        ...,
        description="ID of the conversation this message belongs to",
        example="64309628d1cd938d5163ad49",  # Example ObjectId as a string
    )
    sender: SenderEnum = Field(
        ..., description="Sender of the message, either 'user' or 'ai'", example="user"
    )
    content: str = Field(
        ...,
        description="Text content of the message",
        example="Hello, how can I help you?",
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

    @model_validator(mode="before")
    def convert_objectid(cls, values):
        """
        Convert string fields to PyObjectId during validation.
        """
        for field in ["id", "conversation_id"]:
            if field in values and isinstance(values[field], str):
                try:
                    values[field] = PyObjectId(values[field])
                except ValueError:
                    raise ValidationError(
                        f"Invalid ObjectId for field {field}: {values[field]}"
                    )
        return values

    def dict(self, **kwargs):
        """
        Override `dict` to ensure `created_at` and `updated_at` are serialized to strings.
        """
        kwargs["by_alias"] = True
        data = super().dict(**kwargs)
        if data.get("created_at"):
            data["created_at"] = data["created_at"].isoformat()
        if data.get("updated_at"):
            data["updated_at"] = data["updated_at"].isoformat()
        return data

    def json(self, **kwargs):
        """
        Override `json` to ensure `created_at` and `updated_at` are serialized to strings.
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
                "_id": "64309628d1cd938d5163ad52",
                "conversation_id": "64309628d1cd938d5163ad49",
                "sender": "user",
                "content": "Hello, how can I help you?",
                "created_at": "2024-12-01T12:00:00Z",
                "updated_at": "2024-12-01T12:10:00Z",
            }
        }
