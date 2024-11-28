# web_server/app.py

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from logger.fastapi_logger import web_server_logger
import os
import subprocess
from routes.agent_routes import router as agent_router
from routes.task_routes import router as task_router
from routes.docs_routes import router as docs_router
from routes.healthcheck_routes import router as healthcheck_router
from routes.chatgpt_routes import router as chatgpt_router

logger = web_server_logger

# FastAPI app with Swagger customization
app = FastAPI(
    title="Web Server API",
    description="""
    Web server for managing agents, tasks, and integrations. Includes:
    - Agent download and build triggers
    - Task and healthcheck routes
    - ChatGPT integration for enhanced capabilities
    """,
    version="1.0.0",
    root_path="/web/api/v1",
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


# Register routers
app.include_router(agent_router, prefix="/agents", tags=["Agents"])
app.include_router(task_router, prefix="/tasks", tags=["Tasks"])
app.include_router(healthcheck_router, prefix="/healthcheck", tags=["Healthcheck"])
app.include_router(docs_router, prefix="/docs", tags=["Docs"])
app.include_router(chatgpt_router, prefix="/chatgpt", tags=["ChatGPT"])


@app.get("/download-agent", response_class=FileResponse, tags=["Agents"])
async def download_agent():
    """
    **Download Agent**

    Triggers the build process if the agent file is missing and then serves it.

    **Returns**:
    - `FileResponse`: The built agent file from the `dist` folder.

    **Raises**:
    - 500: If the build process fails or the file is still missing after building.
    """
    dist_folder = os.path.join(os.getcwd(), "dist")
    agent_file = "agent"  # Replace with your actual file name

    file_path = os.path.join(dist_folder, agent_file)

    # Check if the file exists
    if not os.path.exists(file_path):
        logger.info("Agent file not found, triggering build process...")
        try:
            # Trigger the build process
            subprocess.run(["make", "build_agent"], check=True, cwd=os.getcwd())
        except subprocess.CalledProcessError as e:
            logger.error("Build process failed: %s", e)
            raise HTTPException(status_code=500, detail="Build process failed") from e

        # Check again if the file exists after the build
        if not os.path.exists(file_path):
            logger.error("Build completed but agent file is still missing")
            raise HTTPException(
                status_code=500, detail="Agent file not found after build"
            )

    # Serve the file from the dist folder
    logger.info("Serving agent file")
    return FileResponse(
        file_path, filename=agent_file, media_type="application/octet-stream"
    )
