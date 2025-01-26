import os
import socketio
from fastapi import FastAPI
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
from logger.fastapi_logger import socket_listener_logger
from c2_server.events.conversation_events import (
    handle_join_room,
    handle_load_more_messages,
    handle_leave_room,
)
from c2_server.events.message_events import handle_stream_to_ai, handle_send_message
from c2_server.events.agent_events import (
    handle_client_connect,
    handle_client_disconnect,
    handle_agent_registration,
    handle_command_response,
)

# Initialize Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="asgi",
    ping_interval=10,  # Ping every 10 seconds
    ping_timeout=60,  # Allow up to 60 seconds before considering the connection dead
    logger=True,
    engineio_logger=True,
)

# Create FastAPI app
app = FastAPI()

# WSGIApp for Socket.IO + gevent
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Configure logger
logger = socket_listener_logger


# Default event handlers
@sio.on("connect")
async def on_connect(sid, environ):
    """
    Handle client connection.
    """
    await handle_client_connect(sid, environ)


@sio.on("disconnect")
async def on_disconnect(sid):
    """
    Handle client disconnection.
    """
    await handle_client_disconnect(sio, sid)


# Event Registration
@sio.on("on_agent_registration")
async def on_agent_registration(sid, data):
    """
    Handle agent registration.
    """
    await handle_agent_registration(sio, sid, data)


@sio.on("on_command_response")
async def on_command_response(sid, data):
    """
    Handle command response from agents.
    """
    await handle_command_response(sio, sid, data)


@sio.on("join_room")
async def on_join_room(sid, data):
    """
    Handle joining a room.
    """
    await handle_join_room(sio, sid, data)


@sio.on("leave_room")
async def on_leave_room(sid, data):
    """
    Handle leaving a room.
    """
    await handle_leave_room(sio, sid, data)


@sio.on("load_more_messages")
async def on_load_more_messages(sid, data):
    """
    Handle loading more messages in a conversation.
    """
    await handle_load_more_messages(sio, sid, data)


@sio.on("send_message")
async def on_send_message(sid, data):
    """
    Handle sending a message to a conversation.
    """
    await handle_send_message(sio, sid, data)


@sio.on("on_stream_message_to_ai")
async def on_stream_message_to_ai(sid, data):
    """
    Handle streaming a message to AI for processing.
    """
    try:
        logger.info(
            f"Received 'on_stream_message_to_ai' event from SID {sid} with data: {data}"
        )
        await handle_stream_to_ai(sio, sid, data)
    except Exception as e:
        logger.error(f"Error in 'on_stream_message_to_ai': {e}", exc_info=True)
        await sio.emit(
            "error",
            {"error": "An internal error occurred while processing the AI stream."},
            to=sid,
        )


def run_socket_server(host="0.0.0.0", port=5003):
    """
    Runs the Socket.IO server with Gevent for real-time communication.

    Args:
        host (str): The host address for the server. Defaults to "0.0.0.0".
        port (int): The port number for the server. Defaults to 5003.

    The protocol is determined by the `SOCKET_PROTOCOL` environment variable:
        - "http" (default): Starts an HTTP server.
        - "https": Starts an HTTPS server (requires SSL certificates).

    Notes:
        - For HTTPS, set the `SSL_CERTFILE` and `SSL_KEYFILE` environment variables
          to the paths of the SSL certificate and key files.
        - The server is compatible with WebSocket clients using the `geventwebsocket` handler.
    """
    protocol = os.getenv("SOCKET_PROTOCOL", "http").lower()  # Default to 'http'

    logger.info(f"Starting Socket.IO server on {protocol}://{host}:{port}")

    if protocol == "http":
        server = pywsgi.WSGIServer((host, port), app, handler_class=WebSocketHandler)
        server.serve_forever()
    elif protocol == "https":
        certfile = os.getenv("SSL_CERTFILE")
        keyfile = os.getenv("SSL_KEYFILE")

        if not certfile or not keyfile:
            logger.error("SSL_CERTFILE and SSL_KEYFILE must be set for HTTPS.")
            raise ValueError("SSL_CERTFILE and SSL_KEYFILE must be set for HTTPS.")

        server = pywsgi.WSGIServer(
            (host, port),
            app,
            handler_class=WebSocketHandler,
            certfile=certfile,
            keyfile=keyfile,
        )
        server.serve_forever()
    else:
        logger.error("Unsupported protocol. Use 'http' or 'https'.")
        raise ValueError("Unsupported protocol. Use 'http' or 'https'.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run the Socket.IO server via gevent.")
    parser.add_argument("--host", default="0.0.0.0", help="Host address to listen on.")
    parser.add_argument(
        "--port", type=int, default=5003, help="Port number to listen on."
    )
    args = parser.parse_args()

    run_socket_server(host=args.host, port=args.port)
