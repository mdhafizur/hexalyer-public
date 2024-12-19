from typing import Dict, Any
from logger.fastapi_logger import socket_listener_logger
from db.task_repository import TaskRepository
from db.agent_repository import AgentRepository
from models.task import TaskModel
from c2_server.events.utils import current_utc_time

agent_repository = AgentRepository()  # Initialize the repository

# Configure logger
logger = socket_listener_logger

# Create an instance of TaskRepository
task_repo = TaskRepository()

# Dictionary to track connected agents: agent_id -> sid
connected_agents = {}


def handle_client_connect(sid, environ):
    """Handle a new client connection."""
    logger.info("Client connected SID: %s and environ %s", sid, environ)


def handle_client_disconnect(sid):
    """
    Handle agent disconnection and update its status to 'offline'.
    """
    # Find the agent_id associated with the given SID
    agent_id = next(
        (key for key, value in connected_agents.items() if value == sid), None
    )
    if agent_id:
        # Remove the agent from the connected_agents dictionary
        del connected_agents[agent_id]

        # Update the agent's status in the database
        try:
            agent_repository.update_agent(
                agent_id=agent_id,
                update_data={
                    "status": "offline",
                    "last_seen": current_utc_time().isoformat(),  # Update last seen timestamp
                },
            )
            logger.info("Agent %s marked as offline in the database.", agent_id)
        except ValueError as e:
            logger.error("Failed to update status for agent %s: %s", agent_id, str(e))
    else:
        logger.warning("No agent_id found for disconnected SID: %s", sid)

    logger.info("Client disconnected: %s", sid)


def handle_agent_registration(sid, data):
    """
    Register an agent by its agent_id and update its status to 'online'.

    Args:
        sid (str): Socket.IO session ID.
        data (dict): Data sent by the agent (should include agent_id).
    """
    agent_id = data.get("agent_id")
    if not agent_id:
        logger.error("Agent registration failed: Missing agent_id from SID %s", sid)
        return

    # Store the agent_id and sid mapping
    connected_agents[agent_id] = sid

    # Update the agent's status in the database
    try:
        agent_repository.upsert_agent(
            agent_id=agent_id,
            agent_data={
                "status": "online",
                "last_seen": current_utc_time().isoformat(),  # Update last seen timestamp
            },
        )
        logger.info(
            "Agent %s registered and marked as online in the database.", agent_id
        )
    except ValueError as e:
        logger.error("Failed to register agent %s: %s", agent_id, str(e))

    logger.info("Agent %s registered with SID %s", agent_id, sid)


def handle_command_response(sid: str, data: Dict[str, Any]):
    """
    Handle responses from the agent for executed commands.

    Args:
        sid (str): Socket.IO session ID of the agent sending the response.
        data (Dict[str, Any]): The data payload from the agent, including the command response.
    """
    try:
        logger.info("Command response received from SID %s: %s", sid, data)

        # Use Pydantic to validate the task data
        validated_task = TaskModel(**data)

        # Store the task in the database
        task_id = task_repo.create_task(
            validated_task.dict(by_alias=True)
        )  # Use by_alias for MongoDB compatibility
        logger.info("Task created with ID: %s", task_id)

    except ValueError as ve:
        logger.error("Validation error while processing command response: %s", ve)
    except KeyError as ke:
        logger.error("Missing expected key in data: %s", ke)
    except Exception as e:
        logger.error(
            "Unexpected error processing command response: %s", e, exc_info=True
        )
        raise
