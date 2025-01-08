# db/agent_repository.py

from bson.objectid import ObjectId
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from typing import Optional, Dict, Any, List
from db import mongodb


class AgentRepository:
    def __init__(self):
        """Initialize the AgentRepository."""
        if mongodb.db is None:
            mongodb.connect()
        self.collection: Collection = mongodb.get_collection("agents")

    def create_agent(self, agent_data: Dict[str, Any]) -> str:
        """
        Insert a new agent.

        :param agent_data: Dictionary containing agent data.
        :return: The inserted agent's ID as a string.
        :raises ValueError: If the insert operation fails.
        """
        try:
            result = self.collection.insert_one(agent_data)
            return str(result.inserted_id)
        except PyMongoError as e:
            raise ValueError(f"Failed to create agent: {str(e)}")

    def get_agent_by_id(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve an agent by ID.

        :param agent_id: The ObjectId of the agent as a string.
        :return: The agent document as a dictionary or None if not found.
        :raises ValueError: If the ID is invalid or retrieval fails.
        """
        try:
            if not ObjectId.is_valid(agent_id):
                raise ValueError(f"Invalid agent ID: {agent_id}")
            return self.collection.find_one({"agent_id": agent_id})
        except PyMongoError as e:
            raise ValueError(f"Failed to retrieve agent with ID {agent_id}: {str(e)}")

    def update_agent(self, id: str, update_data: Any) -> int:
        """
        Update an agent's data.

        :param agent_id: The ObjectId of the agent as a string.
        :param update_data: Data to update (must support `dict()`).
        :return: Number of modified documents (0 if no match).
        :raises ValueError: If the update operation fails or the ID is invalid.
        """
        try:
            if not ObjectId.is_valid(id):
                raise ValueError(f"Invalid agent ID: {id}")
            result = self.collection.update_one(
                {"_id": ObjectId(id)},
                {"$set": update_data.dict(exclude_unset=True)},
            )
            return result.modified_count
        except PyMongoError as e:
            raise ValueError(f"Failed to update agent with ID {id}: {str(e)}")

    def delete_agent(self, agent_id: str) -> int:
        """
        Delete an agent by ID.

        :param agent_id: The ObjectId of the agent as a string.
        :return: Number of deleted documents (0 if no match).
        :raises ValueError: If the delete operation fails or the ID is invalid.
        """
        try:
            if not ObjectId.is_valid(agent_id):
                raise ValueError(f"Invalid agent ID: {agent_id}")
            result = self.collection.delete_one({"_id": ObjectId(agent_id)})
            return result.deleted_count
        except PyMongoError as e:
            raise ValueError(f"Failed to delete agent with ID {agent_id}: {str(e)}")

    def list_agents(
        self, filter_criteria: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        List all agents matching the criteria.

        :param filter_criteria: Dictionary of filter criteria.
        :return: List of matching agent documents.
        :raises ValueError: If the list operation fails.
        """
        try:
            filter_criteria = filter_criteria or {}
            return list(self.collection.find(filter_criteria))
        except PyMongoError as e:
            raise ValueError(f"Failed to list agents: {str(e)}")

    def upsert_agent(self, agent_id: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Upsert an agent by agent_id.

        :param agent_id: The unique agent identifier.
        :param agent_data: Dictionary containing agent data.
        :return: Dictionary with `matched_count`, `modified_count`, and `upserted_id`.
        :raises ValueError: If the upsert operation fails.
        """
        try:
            agent_data = {
                key: value for key, value in agent_data.items() if key != "_id"
            }
            result = self.collection.update_one(
                {"agent_id": agent_id},  # Match criteria
                {"$set": agent_data},  # Fields to update
                upsert=True,  # Create a new document if no match is found
            )
            return {
                "matched_count": result.matched_count,
                "modified_count": result.modified_count,
                "upserted_id": str(result.upserted_id) if result.upserted_id else None,
            }
        except PyMongoError as e:
            raise ValueError(
                f"Failed to upsert agent with agent_id {agent_id}: {str(e)}"
            )
