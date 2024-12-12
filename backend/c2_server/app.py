# c2_server/app.py

"""
C2 Server API Module

This module defines the FastAPI app for the C2 Server API, which handles:
- Agent registration
- Command delivery to connected agents
- Test endpoints for server health checks
"""

from typing import Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ValidationError
from c2_server.socket_listener import sio, connected_agents
from logger.fastapi_logger import c2_server_logger
from models.agent import AgentModel
from db.agent_repository import AgentRepository
from fastapi.middleware.cors import CORSMiddleware

# Setup the logger
logger = c2_server_logger

# Initialize the repository
agent_repo = AgentRepository()

# FastAPI app
app = FastAPI(
    title="C2 Server API",
    description="""
    Control and Communication API
    """,
    version="1.0.0",
    root_path="/c2/api/v1",
    contact={
        "name": "Support Team",
        "email": "support@example.com",
        "url": "https://example.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc UI
)

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,  # Allow cookies and authentication headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)


class RegistrationRequest(BaseModel):
    """
    Model for validating agent registration requests.

    Attributes:
        agent_id (str): Unique identifier for the agent.
        client_info (dict): Additional information about the client.
    """

    agent_id: str
    client_info: dict


class CommandRequest(BaseModel):
    """
    Model for validating command requests.

    Attributes:
        command (str): The command to be sent to an agent.
    """

    command: str


@app.post("/register", response_model=dict)
async def register_agent(request: RegistrationRequest):
    """
    Endpoint to handle client registration.
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
            "message": "Client registered successfully",
            "agentId": agent_id,
            "upsert_result": upsert_result,
        }
    except ValidationError as ve:
        logger.error("Validation error: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        logger.error("Error handling registration: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/agents/{agent_id}/commands", response_model=dict)
async def send_command(agent_id: str, request: CommandRequest):
    """
    Sends a command to a specific agent over the socket connection.
    """
    # Check if the agent is connected
    sid = connected_agents.get(agent_id)
    if not sid:
        logger.error("Agent %s is not connected", agent_id)
        raise HTTPException(status_code=404, detail="Agent not connected")

    # Convert CommandRequest object to a dictionary
    request_data = request.dict()

    # Extract the command from the updated request data
    command = request_data.get("command")
    if not command:
        logger.error("No command provided for agent %s", agent_id)
        raise HTTPException(status_code=400, detail="No command provided")

    request_data["agent_id"] = agent_id

    try:
        logger.info("Sending command '%s' to Agent %s (SID %s)", command, agent_id, sid)
        sio.emit(
            "execute_command",
            request_data,
            to=sid,
            callback=lambda: print(f"Command delivered to {sid}"),
        )
        return {"status": "success", "message": "Command sent"}
    except Exception as e:
        logger.error("Error sending command to Agent %s: %s", agent_id, e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/", response_model=Dict[str, str])
async def health_check():
    """
    Endpoint to check the health of the service.
    Returns a simple status message.
    """
    return {"status": "ok", "app": "c2"}


@app.route("/security-assessment", methods=["POST"])
async def security_assessment(data: TargetRequest):
    target = data.target

    if not target:
        raise HTTPException(status_code=400, detail='Please provide an IP or domain URL in the "target" field.')

    report = {}

    try:
        # Nmap Scan
        nm = nmap.PortScanner()
        nm.scan(target, arguments='-sV')
        nmap_report = {}
        for host in nm.all_hosts():
            nmap_report[host] = []
            for proto in nm[host].all_protocols():
                ports = nm[host][proto].keys()
                for port in ports:
                    nmap_report[host].append({
                        'protocol': proto,
                        'port': port,
                        'state': nm[host][proto][port]['state'],
                        'service': nm[host][proto][port].get('name', 'unknown'),
                    })
        report['nmap'] = nmap_report
    except Exception as e:
        report['nmap_error'] = str(e)

    try:
        # Whois Lookup
        domain_info = whois.whois(target)
        report['whois'] = {
            'domain_name': domain_info.domain_name,
            'registrar': domain_info.registrar,
            'creation_date': str(domain_info.creation_date),
            'expiration_date': str(domain_info.expiration_date),
            'name_servers': domain_info.name_servers,
        }
    except Exception as e:
        report['whois_error'] = str(e)

    try:
        # OWASP ZAP Vulnerability Assessment (Basic Example)
        zap_url = "http://localhost:8080/JSON/ascan/action/scan/"
        zap_params = {
            'url': target,
            'recurse': True,
            'scanPolicyName': 'Default Policy',
            'method': 'GET',
        }
        zap_response = requests.get(zap_url, params=zap_params)
        report['zap_scan'] = zap_response.json()
    except Exception as e:
        report['zap_error'] = str(e)

    try:
        # Additional GDPR Compliance Check Example (Mocked for simplicity)
        gdpr_check = {
            "data_processing": "Verified",
            "consent_management": "Verified",
            "data_retention": "Verified",
            "third_party_risk": "Verified"
        }
        report['gdpr_compliance'] = gdpr_check
    except Exception as e:
        report['gdpr_error'] = str(e)

    return report

