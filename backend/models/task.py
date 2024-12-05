from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from bson.objectid import ObjectId
from pydantic import ValidationInfo
from models.base import PyObjectId


class TaskModel(BaseModel):
    """
    Pydantic model representing a task executed by an agent.
    """

    id: Optional[PyObjectId] = Field(
        default_factory=ObjectId,
        alias="_id",
        description="MongoDB ObjectId for the task",
    )
    agent_id: str = Field(..., description="Unique ID of the agent executing the task")
    command: str = Field(..., description="Command executed by the agent")
    command_output: Optional[Dict[str, Any]] = Field(
        None,
        description="Output of the executed command, including status and result",
        example={
            "status": "success",
            "output": "/Users/hafiz/dev/planspiel/repo/hexalayer-backend",
        },
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional metadata related to the task",
        example={"priority": "high", "execution_time": "5s"},
    )

    class Config:
        """
        Pydantic configuration for JSON encoding and schema generation.
        """

        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "_id": "64309628d1cd938d5163ad49",
                "agent_id": "c7cec2c7-55a8-4c47-bb92-a538b6a0726c",
                "command": "ls -la",
                "command_output": {
                    "status": "success",
                    "output": "/Users/hafiz/dev/planspiel/repo/hexalayer-backend",
                },
                "metadata": {
                    "priority": "high",
                    "execution_time": "5s",
                },
            }
        }
