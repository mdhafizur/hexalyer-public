from datetime import datetime
from typing import Dict, Any, List
from pydantic import ValidationError
from bson.objectid import ObjectId
from models.message import MessageModel
from db.message_repository import MessageRepository
from db.task_repository import TaskRepository
from models.task import TaskModel
from logger.fastapi_logger import socket_listener_logger
from utils.cybersecurity_client import CyberSecurityClient
from utils.grok_client import XAIChatClient
import socketio
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
import os
import re
import json
from zoneinfo import ZoneInfo  # Python 3.9+ for timezone handling

# Initialize the CyberSecurityClient
client = CyberSecurityClient()
x_ai_client = XAIChatClient()

# Initialize Socket.IO server
sio = socketio.Server(
    cors_allowed_origins="*",
    async_mode="gevent",
    ping_interval=2,  # Ping every 2 seconds
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

# Initialize MessageRepository
message_repo = MessageRepository()


def current_utc_time():
    """Get the current UTC time as a timezone-aware datetime."""
    return datetime.now(ZoneInfo("UTC"))


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
        logger.error(
            "Unexpected error processing command response: %s", e, exc_info=True
        )
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


@sio.event
def join_room(sid, data):
    """
    Handle a client joining a conversation room.

    Args:
        sid (str): Socket.IO session ID.
        data (dict): Should include 'conversation_id', 'page', and 'page_size'.
    """
    conversation_id = data.get("conversation_id")
    page = data.get("page", 1)
    page_size = data.get("page_size", 100)

    if not conversation_id or not ObjectId.is_valid(conversation_id):
        logger.error(
            "join_room failed: Invalid or missing conversation_id from SID %s", sid
        )
        return

    conversation_id = ObjectId(conversation_id)

    # Join the Socket.IO room
    sio.enter_room(sid, str(conversation_id))
    logger.info("SID %s joined room %s", sid, conversation_id)

    # Fetch paginated message history
    skip = (page - 1) * page_size
    try:
        # Fetch the messages from the database
        raw_messages = message_repo.list_messages_with_pagination(
            filter_criteria={"conversation_id": conversation_id},
            skip=skip,
            limit=page_size,
            sort=[("created_at", -1)],
        )

        # Validate and serialize messages using MessageModel
        messages = [MessageModel(**msg).dict(by_alias=True) for msg in raw_messages]
    except ValidationError as ve:
        logger.error("Validation error in messages: %s", str(ve))
        sio.emit("error", {"error": "Message validation failed"}, to=sid)
        return
    except Exception as e:
        logger.error("Error fetching messages: %s", str(e))
        sio.emit("error", {"error": "Failed to fetch messages"}, to=sid)
        return

    # Emit paginated message history
    sio.emit("message_history", {"page": page, "messages": messages}, to=sid)


@sio.event
def send_message(sid, data):
    """
    Handle a client sending a message to a conversation.

    Args:
        sid (str): Socket.IO session ID.
        data (dict): Should include 'conversation_id', 'sender', and 'content'.
    """
    try:
        logger.info("Message received from SID %s: %s", sid, data)

        # Validate the message using Pydantic
        message = MessageModel(**data)

        # Convert message to dictionary with alias for fields
        message_data = message.dict(by_alias=True)

        # Convert `_id` and `conversation_id` to ObjectId if necessary
        if "_id" in message_data and isinstance(message_data["_id"], str):
            message_data["_id"] = ObjectId(message_data["_id"])
        if "conversation_id" in message_data and isinstance(
            message_data["conversation_id"], str
        ):
            message_data["conversation_id"] = ObjectId(message_data["conversation_id"])

        # Save the message to the database
        saved_message_id = message_repo.create_message(message_data)
        saved_message = message_repo.get_message_by_id(saved_message_id)

        if not saved_message:
            logger.error(
                "Failed to retrieve saved message with ID: %s", saved_message_id
            )
            return

        new_message = MessageModel(**saved_message).dict(by_alias=True)

        # Broadcast the new message to the conversation room
        sio.emit("new_message", new_message, to=str(message.conversation_id))

        # # Generate AI response
        # ai_message_content = client.ask(message_data.get("content"))
        # if not ai_message_content:
        #     logger.warning(
        #         "AI response is empty for content: %s", message_data.get("content")
        #     )
        #     return

        # Generate AI response
        ai_message_content = x_ai_client.ask(message_data.get("content"))
        if not ai_message_content:
            logger.warning(
                "AI response is empty for content: %s", message_data.get("content")
            )
            return

        # Clean the string
        cleaned_json_string = re.sub(r'^```json|```$', '', ai_message_content['choices'][0]['message']['content'], flags=re.MULTILINE).strip()

        # Save the AI-generated message
        ai_message_data = {
            "conversation_id": message_data["conversation_id"],
            "sender": "ai",
            # "content": json.dumps(ai_message_content),
            "content": cleaned_json_string,
            "created_at": current_utc_time().isoformat(),
            "updated_at": current_utc_time().isoformat(),
        }
        ai_message_id = message_repo.create_message(ai_message_data)
        ai_saved_message = message_repo.get_message_by_id(ai_message_id)

        if not ai_saved_message:
            logger.error(
                "Failed to retrieve AI-generated message with ID: %s", ai_message_id
            )
            return

        ai_message = MessageModel(**ai_saved_message).dict(by_alias=True)

        # Broadcast the AI-generated message to the conversation room
        sio.emit("ai_message", ai_message, to=str(message.conversation_id))

    except ValidationError as e:
        logger.error("Message validation error: %s", e)
        sio.emit("error", {"error": "Invalid message format."}, to=sid)

    except Exception as e:
        logger.exception("An error occurred while processing the message: %s", e)
        sio.emit("error", {"error": "An internal server error occurred."}, to=sid)


@sio.event
def load_more_messages(sid, data):
    """
    Handle client requests to load more messages for a conversation.

    Args:
        sid (str): Socket.IO session ID.
        data (dict): Should include 'conversation_id', 'sort_by', and 'created_at'.
    """
    try:
        conversation_id = data.get("conversation_id")
        sort_by = data.get("sort_by", "desc")  # Default to descending
        created_at = data.get("created_at")  # The reference created_at for fetching

        if not conversation_id or not ObjectId.is_valid(conversation_id):
            logger.error("Invalid or missing conversation_id from SID %s", sid)
            sio.emit("error", {"error": "Invalid or missing conversation_id"}, to=sid)
            return

        if sort_by not in ["asc", "desc"]:
            logger.error("Invalid sort_by from SID %s: %s", sid, sort_by)
            sio.emit("error", {"error": "Direction must be 'asc' or 'desc'"}, to=sid)
            return

        if not created_at:
            logger.error("Missing created_at from SID %s", sid)
            sio.emit("error", {"error": "Missing created_at"}, to=sid)
            return

        conversation_id = ObjectId(conversation_id)
        reference_time = datetime.fromisoformat(created_at)

        # Query filter based on sort_by
        if sort_by == "desc":
            filter_criteria = {
                "conversation_id": conversation_id,
                "created_at": {"$lt": reference_time},  # Messages older than created_at
            }
            sort_order = [("created_at", -1)]  # Descending order
        else:  # sort_by == "asc"
            filter_criteria = {
                "conversation_id": conversation_id,
                "created_at": {"$gt": reference_time},  # Messages newer than created_at
            }
            sort_order = [("created_at", 1)]  # Ascending order

        # Fetch messages from the database
        raw_messages = message_repo.list_messages_with_pagination(
            filter_criteria=filter_criteria,
            skip=0,  # Always start from the beginning for time-based fetches
            limit=20,  # Fetch a fixed number of messages
            sort=sort_order,
        )

        # Validate and serialize messages
        serialized_messages = [
            MessageModel(**msg).dict(by_alias=True) for msg in raw_messages
        ]

        # Emit the results back to the client
        sio.emit(
            "more_messages",
            {"sort_by": sort_by, "messages": serialized_messages},
            to=sid,
        )

    except ValidationError as e:
        logger.error("Message validation failed for SID %s: %s", sid, e)
        sio.emit("error", {"error": "Invalid message format."}, to=sid)

    except ValueError as e:
        logger.error("Invalid parameters from SID %s: %s", sid, e)
        sio.emit("error", {"error": str(e)}, to=sid)

    except Exception as e:
        logger.error("Error loading messages for SID %s: %s", sid, e, exc_info=True)
        sio.emit("error", {"error": "An internal server error occurred."}, to=sid)


@sio.event
def fetch_missed_messages(sid, data):
    """
    Fetch messages missed during disconnection.

    Args:
        sid (str): Socket.IO session ID.
        data (dict): Contains 'conversation_id' and 'since' timestamp.
    """
    try:
        # Extract required parameters from the client data
        conversation_id = data.get("conversation_id")
        since = data.get("since")

        # Validate the required parameters
        if not conversation_id or not ObjectId.is_valid(conversation_id):
            logger.error(
                "fetch_missed_messages failed: Invalid or missing conversation_id from SID %s",
                sid,
            )
            sio.emit("error", {"error": "Invalid or missing conversation_id"}, to=sid)
            return

        if not since:
            logger.error(
                "fetch_missed_messages failed: Missing 'since' timestamp from SID %s",
                sid,
            )
            sio.emit("error", {"error": "Missing 'since' timestamp"}, to=sid)
            return

        # Convert the since timestamp to a datetime object
        try:
            since_datetime = datetime.fromisoformat(since)
        except ValueError as e:
            logger.error(
                "fetch_missed_messages failed: Invalid 'since' timestamp %s from SID %s",
                since,
                sid,
            )
            sio.emit("error", {"error": f"Invalid 'since' timestamp: {since}"}, to=sid)
            return

        # Query messages from the database since the provided timestamp
        messages = message_repo.list_messages_with_pagination(
            filter_criteria={
                "conversation_id": ObjectId(conversation_id),
                "created_at": {"$gt": since_datetime},
            },
            skip=0,  # Always fetch from the start since the 'since' timestamp acts as the filter
            limit=100,  # Arbitrary limit to avoid large payloads, adjust as needed
            sort=[("created_at", 1)],
        )

        # Emit the missed messages back to the client
        sio.emit("missed_messages", {"messages": messages}, to=sid)

    except Exception as e:
        logger.exception("An error occurred while fetching missed messages: %s", e)
        sio.emit(
            "error",
            {
                "error": "An internal server error occurred while fetching missed messages"
            },
            to=sid,
        )


@sio.event
def leave_room(sid, data):
    """
    Handle a client leaving a conversation room.

    Args:
        sid (str): Socket.IO session ID.
        data (dict): Should include 'conversation_id'.
    """
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        logger.error("leave_room failed: Missing conversation_id from SID %s", sid)
        return

    # Leave the Socket.IO room
    sio.leave_room(sid, conversation_id)
    logger.info("SID %s left room %s", sid, conversation_id)


def run_socket_listener(host="0.0.0.0", port=5003):
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
