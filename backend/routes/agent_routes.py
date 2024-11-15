# routes/agent_routes.py

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from db.agent_repository import AgentRepository
from models.agent import AgentModel
from bson import ObjectId
from bson.json_util import dumps


router = APIRouter()
agent_repo = AgentRepository()


@router.post("/", response_model=AgentModel, status_code=201)
async def create_agent(agent: AgentModel) -> Any:
    """Endpoint to create a new agent and return the whole object."""
    try:
        # Insert the agent into the database
        agent_data = agent.dict(by_alias=True)  # Ensure `_id` is properly handled
        agent_id = agent_repo.create_agent(agent_data)

        # Fetch the inserted agent from the database
        created_agent = agent_repo.get_agent_by_id(agent_id)
        if not created_agent:
            raise HTTPException(
                status_code=500, detail="Failed to retrieve the created agent"
            )

        return created_agent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{agent_id}", response_model=AgentModel)
async def get_agent(agent_id: str):
    """
    Endpoint to get an agent by ID.
    """
    try:
        agent = agent_repo.get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{agent_id}", response_model=Dict[str, str])
async def update_agent(agent_id: str, update_data: AgentModel):
    """
    Endpoint to update an agent.
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


@router.delete("/{agent_id}", response_model=Dict[str, str])
async def delete_agent(agent_id: str):
    """
    Endpoint to delete an agent.
    """
    try:
        deleted_count = agent_repo.delete_agent(agent_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"message": "Agent deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[AgentModel])
async def list_agents(
    filter_codename: Optional[str] = Query(None, description="Filter by codename"),
    filter_hostname: Optional[str] = Query(None, description="Filter by hostname"),
):
    """
    Endpoint to list agents with optional filters.
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
