# main.py

"""
This script initializes and runs multiple services:
- Web Server (FastAPI)
- C2 Server (FastAPI)
- Socket Listener
"""

import os
import threading

from dotenv import load_dotenv
import uvicorn

from c2_server.socket_listener import run_socket_listener
from logger.fastapi_logger import setup_fastapi_logger
from db import mongodb

# Load environment variables from .env file
load_dotenv()

# Configure logger
logger = setup_fastapi_logger("main")

# Connect to the database
mongodb.connect()


def run_web_server():
    """
    Runs the web server on the configured port with Uvicorn.
    """
    web_server_host = os.getenv("WEB_SERVER_HOST", "0.0.0.0")
    web_server_port = int(os.getenv("WEB_SERVER_PORT", "4003"))
    print(f"\nStarting Web Server on http://{web_server_host}:{web_server_port}\n")
    uvicorn.run(
        "web_server.app:app",
        host=web_server_host,
        port=web_server_port,
        log_level="info",
        # log_config=None,  # Disable default logging
        # access_log=False,
    )


def run_c2_server():
    """
    Runs the C2 server on the configured port with Uvicorn.
    """
    c2_server_host = os.getenv("C2_SERVER_HOST", "0.0.0.0")
    c2_server_port = int(os.getenv("C2_SERVER_PORT", "4001"))
    print(f"Starting C2 Server on http://{c2_server_host}:{c2_server_port}\n")
    uvicorn.run(
        "c2_server.app:app",
        host=c2_server_host,
        port=c2_server_port,
        log_level="info",
        # log_config=None,  # Disable default logging
        # access_log=False,
    )


if __name__ == "__main__":
    # Start the socket listener in a separate thread
    socket_host = os.getenv("SOCKET_HOST", "0.0.0.0")
    socket_port = int(os.getenv("SOCKET_PORT", "4000"))
    socket_thread = threading.Thread(
        target=run_socket_listener, args=(socket_host, socket_port), daemon=True
    )
    socket_thread.start()

    # Start the FastAPI servers in separate threads
    web_server_thread = threading.Thread(target=run_web_server, daemon=True)
    c2_server_thread = threading.Thread(target=run_c2_server, daemon=True)

    web_server_thread.start()
    c2_server_thread.start()

    # Keep the main thread alive
    web_server_thread.join()
    c2_server_thread.join()
