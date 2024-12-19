from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Union
from bson.objectid import ObjectId
from models.base import PyObjectId


class Output(BaseModel):
    """
    Model representing the output of a command or step in the execution process.
    """
    type: Literal["precondition_test", "precondition_solve", "command", "cleanup"] = Field(
        ..., description="The type of step (e.g., precondition_test, command, cleanup)."
    )
    command: str = Field(..., description="The executed command.")
    output: str = Field(..., description="The output or result of the command execution.")
    status: Literal["success", "failure"] = Field(
        ..., description="The status of the command execution."
    )


class TaskMetadata(BaseModel):
    """
    Metadata associated with a task.
    """
    priority: Optional[Literal["low", "medium", "high"]] = Field(
        "medium", description="The priority level of the task."
    )
    execution_time: Optional[str] = Field(
        None, description="The total time taken to execute the task."
    )
    created_at: Optional[str] = Field(
        None, description="The timestamp when the task was created."
    )
    completed_at: Optional[str] = Field(
        None, description="The timestamp when the task was completed."
    )


class TaskModel(BaseModel):
    """
    Pydantic model representing a task executed by an agent.
    """
    id: Optional[PyObjectId] = Field(
        default_factory=ObjectId,
        alias="_id",
        description="MongoDB ObjectId for the task",
    )
    agent_id: str = Field(
        ..., description="The ID of the agent for which the command was executed."
    )
    status: Literal["success", "failure"] = Field(
        ..., description="The overall status of the task."
    )
    outputs: List[Output] = Field(
        ..., description="A list of outputs generated during the task execution."
    )
    metadata: Optional[TaskMetadata] = Field(
        default_factory=TaskMetadata,
        description="Optional metadata associated with the task (e.g., priority, execution time).",
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
                "status": "success",
                "outputs": [
                    {
                        "type": "command",
                        "command": "ls -la",
                        "output": "/Users/hafiz/dev/planspiel/repo/hexalayer-backend",
                        "status": "success",
                    },
                    {
                        "type": "cleanup",
                        "command": "rm -f /tmp/testfile.txt",
                        "output": "",
                        "status": "failure",
                    },
                ],
                "metadata": {
                    "priority": "high",
                    "execution_time": "5s",
                    "created_at": "2024-12-15T10:00:00Z",
                    "completed_at": "2024-12-15T10:05:00Z",
                },
            }
        }
