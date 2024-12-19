from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from db.agent_repository import AgentRepository
from models.agent import AgentModel
from bson import ObjectId
from bson.json_util import dumps


router = APIRouter()
agent_repo = AgentRepository()


@router.post(
    "/",
    response_model=AgentModel,
    status_code=201,
    summary="Create a new agent",
    description=(
        "Creates a new agent with the provided data and returns the full agent object. "
        "This endpoint expects a valid agent payload and stores it in the database."
    ),
)
async def create_agent(agent: AgentModel) -> Any:
    """
    **Create Agent**

    - Inserts a new agent into the database.
    - Returns the full agent object upon successful creation.

    **Parameters**:
    - `agent`: The details of the agent to be created.

    **Returns**:
    - `AgentModel`: The created agent object.
    """
    try:
        agent_data = agent.dict(by_alias=True)  # Ensure `_id` is properly handled
        agent_id = agent_repo.create_agent(agent_data)
        created_agent = agent_repo.get_agent_by_id(agent_id)
        if not created_agent:
            raise HTTPException(
                status_code=500, detail="Failed to retrieve the created agent"
            )
        return created_agent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/{agent_id}",
    response_model=AgentModel,
    summary="Retrieve an agent by ID",
    description="Fetches the details of an agent using its unique identifier.",
)
async def get_agent(agent_id: str):
    """
    **Get Agent by ID**

    - Retrieves the agent with the specified ID from the database.

    **Parameters**:
    - `agent_id` (str): The unique identifier of the agent.

    **Returns**:
    - `AgentModel`: The agent details.

    **Raises**:
    - `404`: If the agent is not found.
    - `400`: If the ID is invalid.
    """
    try:
        agent = agent_repo.get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put(
    "/{agent_id}",
    response_model=Dict[str, str],
    summary="Update an existing agent",
    description=(
        "Updates the information of an agent identified by its ID. "
        "Only fields provided in the request will be updated."
    ),
)
async def update_agent(agent_id: str, update_data: AgentModel):
    """
    **Update Agent**

    - Updates the details of an agent with the specified ID.

    **Parameters**:
    - `agent_id` (str): The unique identifier of the agent.
    - `update_data` (AgentModel): The updated data for the agent.

    **Returns**:
    - A success message.

    **Raises**:
    - `404`: If the agent is not found.
    - `400`: If the request is invalid.
    """
    try:
        updated_count = agent_repo.update_agent(
            agent_id, update_data.dict(exclude_unset=True)
        )
        if updated_count == 0:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"message": "Agent updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/{agent_id}",
    response_model=Dict[str, str],
    summary="Delete an agent",
    description="Deletes an agent identified by its ID from the database.",
)
async def delete_agent(agent_id: str):
    """
    **Delete Agent**

    - Removes the agent with the specified ID from the database.

    **Parameters**:
    - `agent_id` (str): The unique identifier of the agent.

    **Returns**:
    - A success message.

    **Raises**:
    - `404`: If the agent is not found.
    - `400`: If the request is invalid.
    """
    try:
        deleted_count = agent_repo.delete_agent(agent_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"message": "Agent deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/",
    response_model=List[AgentModel],
    summary="List all agents with optional filters",
    description=(
        "Retrieves a list of agents from the database. "
        "Optional filters can be applied to narrow down the results."
    ),
)
async def list_agents(
    filter_codename: Optional[str] = Query(None, description="Filter agents by codename"),
    filter_hostname: Optional[str] = Query(None, description="Filter agents by hostname"),
):
    """
    **List Agents**

    - Fetches all agents from the database.
    - Supports optional filters for codename and hostname.

    **Parameters**:
    - `filter_codename` (str, optional): Filter by the agent's codename.
    - `filter_hostname` (str, optional): Filter by the agent's hostname.

    **Returns**:
    - A list of agents matching the criteria.
    """
    try:
        filter_criteria = {}
        if filter_codename:
            filter_criteria["client_info.codename"] = filter_codename
        if filter_hostname:
            filter_criteria["client_info.hostname"] = filter_hostname

        agents = agent_repo.list_agents(filter_criteria)
        return agents
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
