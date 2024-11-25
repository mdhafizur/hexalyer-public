# c2_server/socket_listener.py

"""
Socket.IO server for managing agent connections and task communication.

Handles agent registration, task responses, and WebSocket-based communication.
"""

import os  # Standard library
from typing import Dict, Any  # Standard library

import socketio  # Third-party library
from gevent import pywsgi  # Third-party library
from geventwebsocket.handler import WebSocketHandler  # Third-party library

from db.task_repository import TaskRepository  # First-party import
from models.task import TaskModel  # First-party import
from logger.fastapi_logger import socket_listener_logger  # First-party import

# Initialize Socket.IO server
sio = socketio.Server(
    cors_allowed_origins="*",
    async_mode="gevent",
    ping_interval=5,  # Ping every 5 seconds
    ping_timeout=10,  # Timeout if no pong within 10 seconds
    logger=True,
    engineio_logger=True,
)
app = socketio.WSGIApp(sio)

# Dictionary to track connected agents: agent_id -> sid
connected_agents = {}

# Create an instance of TaskRepository
task_repo = TaskRepository()

# Configure logger
logger = socket_listener_logger


@sio.event
def connect(sid, environ):
    """Handle a new client connection."""
    logger.info("Client connected SID: %s and environ %s", sid, environ)


@sio.event
def register_client(sid, data):
    """
    Register an agent by its agent_id.

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
    logger.info("Agent %s registered with SID %s", agent_id, sid)


@sio.event
def command_response(sid: str, data: Dict[str, Any]):
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
        logger.error("Unexpected error processing command response: %s", e, exc_info=True)
        raise


@sio.event
def disconnect(sid):
    """
    Handle agent disconnection and cleanup.
    """
    # Remove the agent from connected_agents
    agent_id = next(
        (key for key, value in connected_agents.items() if value == sid), None
    )
    if agent_id:
        del connected_agents[agent_id]
        logger.info("Agent %s disconnected.", agent_id)
    logger.info("Client disconnected: %s", sid)


def run_socket_listener(host="0.0.0.0", port=9000):
    """
    Runs the Socket.IO server with Gevent.

    Args:
        host (str): The host address for the server.
        port (int): The port number for the server.
    """
    protocol = os.getenv("SOCKET_PROTOCOL", "http")  # Default to 'http'

    print(f"\nStarting Socket.IO server on {protocol}://{host}:{port}")

    if protocol == "http":
        # Start the HTTP server with Gevent
        server = pywsgi.WSGIServer((host, port), app, handler_class=WebSocketHandler)
        server.serve_forever()
    elif protocol == "https":
        # For HTTPS, you need to provide SSL certificates
        ssl_context = {
            "certfile": os.getenv("SSL_CERTFILE", "path/to/certfile.pem"),
            "keyfile": os.getenv("SSL_KEYFILE", "path/to/keyfile.pem"),
        }
        server = pywsgi.WSGIServer(
            (host, port),
            app,
            handler_class=WebSocketHandler,
            certfile=ssl_context["certfile"],
            keyfile=ssl_context["keyfile"],
        )
        server.serve_forever()
    else:
        logger.error("Unsupported protocol. Use 'http' or 'https'.")
        raise ValueError("Unsupported protocol. Use 'http' or 'https'.")
