# c2_server/app.py

import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError, Field
from c2_server.c2_socket_server import sio
from c2_server.events.agent_events import connected_agents
from logger.fastapi_logger import c2_server_logger
from models.agent import AgentModel, AgentRegistrationRequest
from db.agent_repository import AgentRepository

# Setup the logger
logger = c2_server_logger

# Initialize the repository
agent_repo = AgentRepository()

# FastAPI app
app = FastAPI(
    title="C2 Server API",
    description=(
        "The Control and Communication (C2) API enables interaction between "
        "the central server and connected agents. This includes agent registration, "
        "command dispatch, and health checks."
    ),
    version="1.0.0",
    root_path="/c2/api/v1",
    contact={
        "name": "Support Team",
        "email": os.getenv("SUPPORT_EMAIL", "support@example.com"),
        "url": os.getenv("SUPPORT_URL", "https://example.com"),
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc UI
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
agents_router = APIRouter(prefix="/agents", tags=["Agents"])
health_router = APIRouter(tags=["Health Check"])


class InputField(BaseModel):
    name: str = Field(..., description="The name of the input.")
    description: str = Field(
        ..., description="A brief description of the input's purpose."
    )
    type: Optional[str] = Field(
        "", description="The data type of the input, if applicable."
    )
    value: str = Field(..., description="The value associated with the input.")


class Precondition(BaseModel):
    description: str = Field(..., description="Description of the precondition.")
    test_cmd: str = Field(..., description="The command to test the precondition.")
    solve_cmd: Optional[str] = Field(
        None, description="Command to resolve the precondition if it fails."
    )


class CommandRequest(BaseModel):
    """
    Model for validating command requests.
    """

    preconditions: Optional[List[Precondition]] = Field(
        default=None,
        example=[
            {
                "description": "Chrome must be installed",
                "test_cmd": "Test if Chrome executable exists.",
                "solve_cmd": "Download and install Chrome if not installed.",
            }
        ],
        description="Optional list of preconditions required before executing the commands.",
    )
    commands: List[str] = Field(
        ...,
        example=[
            "# Define a list of Chrome extension IDs to be installed",
            '$extList = "fcfhplploccackoneaefokcmbjfbkenj", "fdcgdnkidjaadafnichfpabhfomcebme"',
            "foreach ($extension in $extList) { New-Item -Path HKLM:\\Software\\Google\\Chrome\\Extensions\\$extension -Force }",
        ],
        description="List of commands to be executed.",
    )
    inputs: Optional[List[InputField]] = Field(
        default=None,
        example=[
            {
                "name": "chrome_url",
                "description": "Chrome installer download URL",
                "type": "",
                "value": "https://dl.google.com/chrome/install/ChromeStandaloneSetup64.exe",
            },
            {
                "name": "extension_id",
                "description": "Chrome extension ID",
                "type": "",
                "value": '"fcfhplploccackoneaefokcmbjfbkenj", "fdcgdnkidjaadafnichfpabhfomcebme"',
            },
        ],
        description="Optional list of inputs required for the commands.",
    )
    cleanups: Optional[List[str]] = Field(
        default=None,
        example=[
            "Remove registry keys created for Chrome extensions",
            "Delete temporary files in the Downloads folder.",
        ],
        description="Optional list of cleanup steps to be executed after the commands.",
    )


# Agent Endpoints
@agents_router.post(
    "/register",
    response_model=dict,
    summary="Register a new agent",
    description="Registers a new agent with the C2 server and stores its information.",
)
async def register_agent(request: AgentRegistrationRequest):
    """
    Endpoint to handle agent registration.
    """
    try:
        logger.info("Received registration request: %s", request.dict())

        # Convert RegistrationRequest object to a mutable dictionary
        request_data = request.dict()

        # Extract agent_id from the request
        agent_id = request.agent_id
        if not agent_id:
            raise HTTPException(
                status_code=400, detail="Missing 'agent_id' in registration request"
            )

        # Validate agent data using the AgentModel
        validated_agent = AgentModel(**request_data)

        # Perform upsert using the agent_id and remaining data
        upsert_result = agent_repo.upsert_agent(
            agent_id, validated_agent.dict(by_alias=True)
        )
        logger.info("Agent upsert result: %s", upsert_result)

        return {
            "status": "success",
            "message": "Agent registered successfully",
            "agentId": agent_id,
            "upsert_result": upsert_result,
        }
    except ValidationError as ve:
        logger.error("Validation error: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        logger.error("Error handling registration: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@agents_router.post(
    "/{agent_id}/commands",
    response_model=dict,
    summary="Send a command to an agent",
    description=(
        "Dispatches a structured set of commands, including preconditions, inputs, and cleanups, "
        "to a specific agent over the WebSocket connection. The agent must be connected to receive the command."
    ),
)
async def send_command(agent_id: str, request: CommandRequest):
    """
    Sends a structured command request to a specific agent over the WebSocket connection.
    """
    # Check if the agent is connected
    sid = connected_agents.get(agent_id)
    if not sid:
        logger.error(f"Agent '{agent_id}' is not connected.")
        raise HTTPException(status_code=404, detail="Agent not connected")

    # Convert CommandRequest object to a dictionary
    request_data = request.dict()
    request_data["agent_id"] = agent_id  # Include the agent ID in the request data

    # Validate that necessary fields are present
    if not request_data.get("commands"):
        logger.error(f"No commands provided for agent '{agent_id}'.")
        raise HTTPException(status_code=400, detail="No commands provided")

    # Handle input placeholders
    inputs = {
        input_field["name"]: input_field["value"]
        for input_field in (request_data.get("inputs") or [])
    }

    def replace_placeholders(value: str) -> str:
        """
        Replace placeholders in a string with values from inputs.
        Logs an error if unresolved placeholders are found.
        """
        original_value = value  # Store the original value for logging
        for input_name, input_value in inputs.items():
            placeholder = f"#{{{input_name}}}"
            value = value.replace(placeholder, input_value)

        logger.debug(f"Replaced placeholders: '{original_value}' -> '{value}'")
        return value

    # Replace placeholders in preconditions
    for precondition in request_data.get("preconditions", []):
        if "test_cmd" in precondition:
            precondition["test_cmd"] = replace_placeholders(precondition["test_cmd"])
        if "solve_cmd" in precondition:
            precondition["solve_cmd"] = replace_placeholders(precondition["solve_cmd"])

    # Replace placeholders in commands
    request_data["commands"] = [
        replace_placeholders(command) for command in request_data["commands"]
    ]

    # Replace placeholders in cleanups
    request_data["cleanups"] = [
        replace_placeholders(cleanup) for cleanup in request_data.get("cleanups", [])
    ]

    try:
        logger.info(
            f"Sending command data to Agent '{agent_id}' (SID: {sid}): {request_data}"
        )
        # Emit the entire structured data to the WebSocket
        await sio.emit(
            "on_execute_command",
            request_data,
            to=sid,
        )
        logger.info(
            f"Command data successfully delivered to Agent '{agent_id}' (SID: {sid})."
        )
        return {"status": "success", "message": "Command sent"}
    except ValueError as ve:
        logger.error(f"Validation error while sending command: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error sending command to Agent '{agent_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send command") from e


# Health Endpoints
@health_router.get(
    "/healthcheck",
    response_model=dict,
    summary="Check server health",
    description="Simple endpoint to verify the server is running and healthy.",
)
async def health_check():
    """
    Endpoint to check the health of the service.
    Returns a simple status message.
    """
    return {"status": "ok", "app": "c2"}


# Include Routers in the App
app.include_router(agents_router)
app.include_router(health_router)
