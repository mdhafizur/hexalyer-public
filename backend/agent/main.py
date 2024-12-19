# agent/main.py

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
import time
from time import sleep

import requests
import socketio
from typing import List, Dict

# Add the parent directory of the `agent` package to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent.helper import (
    get_agent_id,
    get_client_info,
    run_command,
    run_command_in_script_mode,
)
from c2_server.events.utils import current_utc_time

# Configuration for logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Enhanced logging setup
logging.basicConfig(
    level=getattr(
        logging, LOG_LEVEL, logging.INFO
    ),  # Fetch log level from environment or use INFO
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
        self.sio.on("connect", self.connect)
        self.sio.on("disconnect", self.disconnect)
        self.sio.on("on_execute_command", self.execute_command)

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

    def connect(self):
        """
        Handle successful connection to the Socket.IO server.
        """
        logging.info("Connected to Socket.IO server at %s", self.socket_url)
        if self.agent_id:
            logging.debug(
                "Agent ID already set: %s. Registering Socket.IO client.", self.agent_id
            )
            self.register_socket_client()

    def disconnect(self):
        """
        Handle disconnection from the Socket.IO server.
        """
        logging.warning("Disconnected from the Socket.IO server")

    def execute_command(self, data: dict):
        """
        Handle the execution of a command sent by the C2 server.

        Args:
            data (dict): Contains `agent_id`, `task_id`, `preconditions`, `commands`, and `cleanups`.
        """
        logging.info("Received 'execute_command' event with data: %s", data)
        logging.debug("Command event details: %s", data)

        # Retrieve the agent_id and commands
        agent_id = data.get("agent_id")
        preconditions: List[Dict] = data.get("preconditions", [])
        commands: List[str] = data.get("commands", [])
        cleanups: List[str] = data.get("cleanups", [])

        if not commands:
            logging.error("No commands received in the event data")
            self._send_response(
                {"agent_id": agent_id, "status": "failure", "outputs": []}
            )
            return

        all_outputs = []
        overall_status = "success"  # Default status

        # Track execution time
        start_time = time.time()

        # Step 1: Execute preconditions
        if preconditions:
            logging.info("Executing preconditions for agent %s", agent_id)
            for precondition in preconditions:
                test_cmd = precondition.get("test_cmd")
                solve_cmd = precondition.get("solve_cmd")

                if test_cmd:
                    logging.debug("Executing precondition test_cmd: %s", test_cmd)
                    test_output = run_command_in_script_mode(test_cmd)
                    test_status = (
                        "failure" if "failure" in test_output.lower() else "success"
                    )
                    all_outputs.append(
                        {
                            "type": "precondition_test",
                            "command": test_cmd,
                            "output": test_output,
                            "status": test_status,
                        }
                    )

                    # If test_cmd fails, attempt solve_cmd if available
                    if test_status == "failure" and solve_cmd:
                        logging.debug("Executing precondition solve_cmd: %s", solve_cmd)
                        solve_output = run_command_in_script_mode(solve_cmd)
                        solve_status = (
                            "success"
                            if "success" in solve_output.lower()
                            else "failure"
                        )
                        all_outputs.append(
                            {
                                "type": "precondition_solve",
                                "command": solve_cmd,
                                "output": solve_output,
                                "status": solve_status,
                            }
                        )
                        # Update overall status if solve_cmd also fails
                        if solve_status == "failure":
                            overall_status = "failure"
                            logging.error(
                                "Precondition solve failed. Halting execution."
                            )
                            break  # Halt execution on critical precondition failure
                else:
                    logging.warning("Precondition missing test_cmd: %s", precondition)

        # Step 2: Execute main commands
        if overall_status == "success":  # Only proceed if preconditions passed
            logging.info("Executing main commands for agent %s", agent_id)
            for command in commands:
                logging.debug("Executing command: %s", command)
                command_output = run_command_in_script_mode(command)
                command_status = (
                    "failure"
                    if "error" in command_output.lower()
                    or "failure" in command_output.lower()
                    or not command_output
                    else "success"
                )
                all_outputs.append(
                    {
                        "type": "command",
                        "command": command,
                        "output": command_output,
                        "status": command_status,
                    }
                )
                if command_status == "failure":
                    overall_status = "failure"
                    logging.error("Command execution failed: %s", command)

        # Step 3: Execute cleanups
        if cleanups:
            logging.info("Executing cleanup commands for agent %s", agent_id)
            for cleanup_command in cleanups:
                logging.debug("Executing cleanup command: %s", cleanup_command)
                cleanup_output = run_command_in_script_mode(cleanup_command)
                cleanup_status = (
                    "failure"
                    if "error" in cleanup_output.lower()
                    or "failure" in cleanup_output.lower()
                    or not cleanup_output
                    else "success"
                )
                all_outputs.append(
                    {
                        "type": "cleanup",
                        "command": cleanup_command,
                        "output": cleanup_output,
                        "status": cleanup_status,
                    }
                )
                if cleanup_status == "failure":
                    overall_status = "failure"
                    logging.error("Cleanup command failed: %s", cleanup_command)

        # Track execution time
        execution_time = time.time() - start_time

        # Step 4: Prepare and send response
        response = {
            "agent_id": agent_id,
            "status": overall_status,
            "outputs": all_outputs,
            "metadata": {
                "execution_time": f"{execution_time:.2f}s",
            },
        }
        self._send_response(response)

    def _send_response(self, response: dict):
        """
        Sends a response back to the server.

        Args:
            response (dict): The response data to send.
        """
        try:
            self.sio.emit("on_command_response", response)
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

    def register_agent(self):
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

        client_data = {
            "agent_id": self.agent_id,
            "client_info": client_info,
            "status": "online",
            "last_seen": current_utc_time().isoformat(),
        }
        logging.info("Registering client with C2 API: %s", client_data)
        logging.debug("Client registration payload: %s", client_data)

        try:
            response = requests.post(
                f"{self.c2_url}/c2/api/v1/agents/register", json=client_data, timeout=5
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
            self.sio.emit("on_agent_registration", client_data)
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
            agent.register_agent()
            agent.listen()
        except Exception as e:
            logging.error("An error occurred: %s", e)
            logging.debug("Exception details: %s", e, exc_info=True)
            logging.info("Restarting agent in 5 seconds...")
            sleep(5)
