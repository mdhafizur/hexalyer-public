# web_server/app.py

import os
import subprocess
from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException
from routes.agent_routes import router as agent_router
from routes.task_routes import router as task_router
from routes.conversation_routes import router as conversation_router
from routes.report_routes import router as report_router
from routes.healthcheck_routes import router as healthcheck_router
from routes.message_routes import router as message_router
from routes.chatgpt_routes import router as chatgpt_router
from routes.auth_routes import router as auth_router
from routes.webhex_routes import router as webhex_router
from logger.fastapi_logger import web_server_logger
from fastapi.middleware.cors import CORSMiddleware
from middleware.auth_middleware import AuthMiddleware


logger = web_server_logger

# FastAPI app with Swagger customization
app = FastAPI(
    title="Web Server API",
    description="Web server for managing agents, tasks, and integrations.",
    version="1.0.0",
    root_path="/web/api/v1",
    contact={
        "name": "Support Team",
        "email": os.getenv("SUPPORT_EMAIL", "support@example.com"),
        "url": os.getenv("SUPPORT_URL", "https://example.com"),
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add the authentication middleware
app.add_middleware(AuthMiddleware)

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(agent_router, prefix="/agents", tags=["Agents"])
app.include_router(task_router, prefix="/tasks", tags=["Tasks"])
app.include_router(conversation_router, prefix="/conversations", tags=["Conversations"])
app.include_router(message_router, prefix="/messages", tags=["Messages"])
app.include_router(healthcheck_router, prefix="/healthcheck", tags=["Healthcheck"])
app.include_router(chatgpt_router, prefix="/chatgpt", tags=["ChatGPT"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(webhex_router, prefix="/webhex", tags=["WebHex"])
app.include_router(report_router, prefix="/reports", tags=["Reports"])


@app.get("/download-agent/{agent_type}", response_class=FileResponse, tags=["Agents"])
async def download_agent(agent_type: str):
    """
    **Download Agent**

    Triggers the build process for the specified agent type if the file is missing and then serves it.

    **Parameters**:
    - `agent_type`: The type of agent to download. Options are `linux` or `windows`.

    **Returns**:
    - `FileResponse`: The built agent file from the `dist` folder.

    **Raises**:
    - 400: If the agent type is invalid.
    - 500: If the build process fails or the file is still missing after building.
    """
    if agent_type not in ["linux", "windows"]:
        logger.error("Invalid agent type provided: %s", agent_type)
        raise HTTPException(
            status_code=400, detail="Invalid agent type. Choose 'linux' or 'windows'."
        )

    dist_folder = os.path.join(os.getcwd(), "dist")
    agent_file = (
        f"agent{'.exe' if agent_type == 'windows' else ''}"  # Append .exe for Windows
    )

    file_path = os.path.join(dist_folder, agent_file)

    # Check if the file exists
    if not os.path.exists(file_path):
        logger.info(
            "Agent file not found for %s, triggering build process...", agent_type
        )
        try:
            # Trigger the build process
            build_target = f"build_agent_{agent_type}"
            subprocess.run(["make", build_target], check=True, cwd=os.getcwd())
        except subprocess.CalledProcessError as e:
            logger.error("Build process failed for %s: %s", agent_type, e)
            raise HTTPException(
                status_code=500, detail=f"Build process failed for {agent_type}"
            ) from e

        # Check again if the file exists after the build
        if not os.path.exists(file_path):
            logger.error(
                "Build completed but agent file is still missing for %s", agent_type
            )
            raise HTTPException(
                status_code=500,
                detail=f"Agent file not found after build for {agent_type}",
            )

    # Serve the file from the dist folder
    logger.info("Serving agent file for %s", agent_type)
    return FileResponse(
        file_path, filename=agent_file, media_type="application/octet-stream"
    )


# Path to the `agent_ui_app.app` file
DIST_FOLDER = "dist"


@app.get("/download/agent_ui_app/{conversation_id}")
async def download_agent_ui_app(conversation_id: str):
    """
    Endpoint to build and download the compressed agent_ui_app.zip file.
    """
    try:
        # Run the build script with the conversation_id
        subprocess.run(["./build_and_bind.sh", conversation_id], check=True)

        # Define file paths
        executable_name = f"agent_app_{conversation_id}"
        zip_file_name = f"{executable_name}.zip"
        zip_file_path = os.path.join(DIST_FOLDER, zip_file_name)

        # Check if the zip file exists
        if not os.path.exists(zip_file_path):
            raise HTTPException(status_code=404, detail="ZIP file not found!")

        # Return the ZIP file for download
        return FileResponse(
            path=zip_file_path,
            filename=zip_file_name,
            media_type="application/zip",
        )
    except subprocess.CalledProcessError as e:
        # Handle build errors
        raise HTTPException(status_code=500, detail=f"Build failed: {e}")
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
