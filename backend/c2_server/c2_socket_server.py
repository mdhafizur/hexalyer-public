# c2_server/c2_socket_server.py

import os
import socketio
from geventwebsocket.handler import WebSocketHandler
from gevent import pywsgi
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
sio = socketio.Server(
    cors_allowed_origins="*",
    async_mode="gevent",
    ping_interval=5,  # Increase to 5 seconds for a balanced interval
    ping_timeout=20,  # Increase to 20 seconds to match client timeout settings
    logger=True,
    engineio_logger=True,
)

# Modify the WSGIApp initialization to include the path prefix
app = socketio.WSGIApp(
    sio, 
    # static_files=None, 
    # socketio_path="/ws/socket.io"
)

# Configure logger
logger = socket_listener_logger

# these are default event triggered when socket is connected and disconnect
sio.on("connect", handle_client_connect)
sio.on("disconnect", handle_client_disconnect)

# Event Registration
sio.on("on_agent_registration", handle_agent_registration)
sio.on("on_command_response", handle_command_response)


sio.on("join_room", lambda sid, data: handle_join_room(sio, sid, data))
sio.on("leave_room", lambda sid, data: handle_leave_room(sio, sid, data))
sio.on(
    "load_more_messages", lambda sid, data: handle_load_more_messages(sio, sid, data)
)


sio.on("send_message", lambda sid, data: handle_send_message(sio, sid, data))
sio.on("on_stream_message_to_ai", lambda sid, data: handle_stream_to_ai(sio, sid, data))


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
