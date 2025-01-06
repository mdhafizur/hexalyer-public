
# Project Structure and Instructions

## Project Overview
This project consists of three main components:
1. **Agent**: Client application that connects to the C2 server.
2. **C2 Server**: Command and Control server that communicates with agents.
3. **Web Server**: FastAPI application for managing agents and tasks.

## Directory Structure
```
project-root/
├── agent/                       # Agent-specific logic and execution
│   ├── __init__.py
│   ├── helper.py                # Helper functions for agent
│   ├── main.py                  # Main agent script
│   ├── agent.spec               # PyInstaller spec for agent binary
│   ├── utils.py                 # Utility functions for agent
│   ├── config.py                # Configuration for agent
├── c2_server/                   # Command and Control (C2) server logic
│   ├── __init__.py
│   ├── app.py                   # FastAPI app for C2 server
│   ├── socket_listener.py       # WebSocket/Socket.IO logic for C2
│   ├── services/                # Business logic for the C2 server
│   │   ├── __init__.py
│   │   ├── agent_service.py     # Services for managing agents
│   │   ├── task_service.py      # Services for managing tasks
│   ├── config.py                # Configuration for the C2 server
├── db/                          # Database access logic
│   ├── __init__.py
│   ├── agent_repository.py      # Agent database operations
│   ├── task_repository.py       # Task database operations
│   ├── connection.py            # Database connection setup
├── dist/                        # Distribution builds (e.g., agent binaries)
├── logger/                      # Logging setup
│   ├── __init__.py
│   ├── fastapi_logger.py        # Logger configuration for FastAPI
│   ├── general_logger.py        # General logging configuration
│   ├── config.py                # Logger configuration file
├── logs/                        # Directory for application logs
│   ├── c2_logs/                 # Logs specific to the C2 server
│   ├── agent_logs/              # Logs specific to the agent
│   ├── socket_logs/             # Socket.IO logs
├── models/                      # Pydantic models for validation
│   ├── __init__.py
│   ├── agent.py                 # Models related to agents
│   ├── task.py                  # Models related to tasks
│   ├── common.py                # Common/shared models
├── routes/                      # FastAPI route definitions
│   ├── __init__.py
│   ├── agent_routes.py          # Routes for agent operations
│   ├── task_routes.py           # Routes for task operations
│   ├── healthcheck_routes.py    # Routes for health checks
│   ├── docs_routes.py           # Routes for API documentation and metadata
├── web_server/                  # Web server logic (main FastAPI application)
│   ├── __init__.py
│   ├── app.py                   # FastAPI app entry point
│   ├── config.py                # Configuration for the web server
├── tests/                       # Unit and integration tests
│   ├── __init__.py
│   ├── test_agent.py            # Tests for agent functionality
│   ├── test_task.py             # Tests for task functionality
│   ├── test_routes.py           # Tests for API routes
│   ├── test_utils.py            # Tests for utility functions
│   ├── fixtures/                # Test fixtures (e.g., mock data)
│   │   ├── __init__.py
│   │   ├── agent_fixtures.py    # Mock data for agents
│   │   ├── task_fixtures.py     # Mock data for tasks
├── static/                      # Static files (e.g., HTML, CSS, JavaScript)
│   ├── docs/                    # API documentation
│   ├── assets/                  # Additional assets
├── .env                         # Environment variables
├── Makefile                     # Make commands for automation (e.g., build, test, run)
├── Dockerfile                   # Docker configuration for deployment
├── docker-compose.yml           # Docker Compose for multi-service setup
├── Readme.md                    # General project documentation
├── Readme-agentmodule.md        # Detailed documentation for the agent module
├── Readme-socketio.md           # Documentation for Socket.IO communication
├── requirements.txt             # Python dependencies
├── requirements-dev.txt         # Development-specific dependencies (e.g., testing, linting)
├── test_socket.py               # Socket.IO test script
├── main.py                      # Main entry point for starting the application

```

## Instructions

### 1. Setup
1. Clone the repository:
   ```bash
   git clone <repo_url>
   cd project-root
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

### 2. Run the Application
#### Start the Web Server:
```bash
uvicorn web_server.app:app --host localhost --port 8000 --reload
```

#### Start the C2 Server:
```bash
python c2_server/app.py
```

#### Run the Agent:
```bash
python agent/main.py
```

### 3. Testing
Run the tests using `pytest`:
```bash
pytest tests/
```

### 4. Building the Agent
Use the Makefile to build the agent binary:
```bash
make build
```

### 5. Logs
Logs are stored in the `logs/` directory. Separate files are maintained for different log levels.

---

By following this structure and instructions, you ensure a maintainable, scalable, and clean project setup.
