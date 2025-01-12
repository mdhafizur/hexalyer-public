import logging
import os
import sys
from time import sleep
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List, Dict

import requests
import socketio

from agent.helper import (
    get_agent_id,
    get_client_info,
    run_command,
    run_command_in_script_mode,
)

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

# Initialize Socket.IO client
sio = socketio.Client(reconnection=True, reconnection_attempts=5)

class Agent:
    """
    Represents an agent that interacts with a Command and Control (C2) server using REST and Socket.IO.
    
    Attributes:
        c2_url (str): URL of the C2 server REST API.
        socket_url (str): URL of the Socket.IO server.
        user_id (str): Identifier for the user associated with the agent.
        conversation_id (str): Identifier for the agent's conversation context.
        is_registered (bool): Indicates whether the agent is registered with the C2 API.
        agent_id (str): Unique identifier for the agent.
    """

    def __init__(self, c2_url: str, socket_url: str, user_id: str, conversation_id: str):
        self.c2_url = c2_url
        self.socket_url = socket_url
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.is_registered = False
        self.agent_id = None
        self.register_socket_events()

    def register_socket_events(self):
        """Register event handlers for Socket.IO communication."""

        @sio.on("connect")
        def on_connect():
            logging.info("Connected to the Socket.IO server.")
            self.register_agent()

        @sio.on("disconnect")
        def on_disconnect():
            logging.warning("Disconnected from the Socket.IO server.")

        @sio.on("on_execute_command")
        def on_execute_command(data: dict):
            self.handle_command(data)

    def handle_command(self, data: dict):
        """Handle command execution sent from the server."""
        logging.info("Received command: %s", data)

        created_at = datetime.now(ZoneInfo("UTC"))
        outputs = []
        overall_status = "success"

        # Extract metadata and commands
        metadata = data.get("metadata", {})
        priority = metadata.get("priority", "medium")
        preconditions = data.get("preconditions", [])
        commands = data.get("commands", [])
        cleanups = data.get("cleanups", [])

        def execute_steps(steps: List[Dict], step_type: str):
            nonlocal overall_status
            for step in steps:
                cmd = step.get("test_cmd" if step_type == "precondition" else "command")
                if cmd:
                    output = run_command_in_script_mode(cmd)
                    status = "failure" if "failure" in output.lower() else "success"
                    outputs.append({
                        "type": step_type,
                        "command": cmd,
                        "output": output,
                        "status": status,
                    })
                    if status == "failure":
                        if step_type == "precondition" and "solve_cmd" in step:
                            solve_output = run_command_in_script_mode(step["solve_cmd"])
                            solve_status = "success" if "success" in solve_output.lower() else "failure"
                            outputs.append({
                                "type": "precondition_solve",
                                "command": step["solve_cmd"],
                                "output": solve_output,
                                "status": solve_status,
                            })
                            if solve_status == "failure":
                                overall_status = "failure"
                                break
                        else:
                            overall_status = "failure"
                            break

        # Execute preconditions, main commands, and cleanup steps
        execute_steps(preconditions, "precondition")

        if overall_status == "success":
            execute_steps(commands, "command")

        execute_steps(cleanups, "cleanup")

        # Prepare response
        completed_at = datetime.now(ZoneInfo("UTC"))
        execution_time = (completed_at - created_at).total_seconds()
        response = {
            "agent_id": self.agent_id,
            "conversation_id": self.conversation_id,
            "status": overall_status,
            "outputs": outputs,
            "priority": priority,
            "execution_time": f"{execution_time:.2f}s",
            "completed_at": completed_at.isoformat(),
            "created_at": created_at.isoformat(),
            "created_by": self.user_id,
        }

        logging.info("Command execution completed with response: %s", response)
        sio.emit("on_command_response", response)

    def register_agent(self):
        """Register the agent with the C2 server."""
        if self.is_registered:
            return

        client_info = get_client_info()
        self.agent_id, error = get_agent_id()

        if error or not self.agent_id:
            logging.error("Failed to retrieve agent ID.")
            return

        client_data = {
            "agent_id": self.agent_id,
            "conversation_id": self.conversation_id,
            "created_by": self.user_id,
            "client_info": client_info,
            "status": "online",
            "last_seen": datetime.now(ZoneInfo("UTC")).isoformat(),
        }

        logging.info("Registering agent with the server: %s", client_data)

        try:
            sio.emit("on_agent_registration", client_data)
            self.is_registered = True
            logging.info("Agent registered successfully.")
        except Exception as e:
            logging.error("Failed to register agent: %s", e)

if __name__ == "__main__":
    c2_url = os.getenv("C2_URL", "http://localhost:5001/c2/api/v1")
    socket_url = os.getenv("SOCKET_URL", "http://localhost:5003")
    user_id = os.getenv("USER_ID", "default_user_id")
    conversation_id = os.getenv("CONVERSATION_ID", "default_conversation_id")

    while True:
        try:
            logging.info("Starting agent...")
            agent = Agent(c2_url, socket_url, user_id, conversation_id)
            sio.connect(socket_url)
            sio.wait()
        except Exception as e:
            logging.error("An error occurred: %s", e, exc_info=True)
            logging.info("Retrying connection in 5 seconds...")
            sleep(5)
