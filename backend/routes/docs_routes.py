# routes/docs_routes.py

from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.get("/", response_model=Dict[str, str])
async def get_api_metadata():
    """
    Endpoint to retrieve API metadata or documentation links.
    """
    return {
        "name": "Hexalayer Backend API",
        "version": "1.0.0",
        "description": "This API powers the Hexalayer backend, managing agents, tasks, and more.",
        "documentation_url": "/docs",  # FastAPI's built-in Swagger UI
        "redoc_url": "/redoc",        # FastAPI's built-in ReDoc UI
    }

@router.get("/changelog", response_model=Dict[str, str])
async def get_changelog():
    """
    Endpoint to retrieve the changelog or version history of the API.
    """
    return {
        "1.0.0": "Initial release with agent and task management features.",
        "1.1.0": "Added health checks and improved logging.",
        "1.2.0": "Enhanced API documentation routes.",
    }
