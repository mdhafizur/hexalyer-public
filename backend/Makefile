# Define variables
SCRIPT = agent/main.py
OUTPUT_DIR = dist
EXECUTABLE_NAME = agent
VENV_DIR = .venv

# Command to create a virtual environment and install dependencies
setup: $(VENV_DIR)
	. $(VENV_DIR)/bin/activate && pip install -r requirements.txt

$(VENV_DIR):
	python3 -m venv $(VENV_DIR)

# Command to activate virtual environment
activate:
	. $(VENV_DIR)/bin/activate

# Command to generate requirements.txt
gen_req: activate
	pip freeze > requirements.txt

# Target to clean up previous builds
build_clean:
	rm -rf build/ $(OUTPUT_DIR)/ $(EXECUTABLE_NAME).spec

# Target to build the Mach-O executable for Linux
build_agent_linux: build_clean setup
	USER_ID=$(USER_ID) CONVERSATION_ID=$(CONVERSATION_ID) . $(VENV_DIR)/bin/activate && pyinstaller --onefile --name $(EXECUTABLE_NAME) $(SCRIPT)

# Target to build the Windows executable
build_agent_windows: build_clean setup
	USER_ID=$(USER_ID) CONVERSATION_ID=$(CONVERSATION_ID) . $(VENV_DIR)/bin/activate && pyinstaller --onefile --name $(EXECUTABLE_NAME).exe $(SCRIPT)

# Target to run the executable
run_agent: build
	./$(OUTPUT_DIR)/$(EXECUTABLE_NAME)

build_agent_app:
	. $(VENV_DIR)/bin/activate && pyinstaller --onefile --windowed agent/agent_ui_app.py && zip -r /dist/agent_ui_app.zip agent_ui_app.app




# Variables
DOCKER_REGISTRY ?= registry.digitalocean.com
IMAGE_NAME_BACKEND ?= registry.digitalocean.com/hexashield/backend
IMAGE_TAG ?= latest
DOCKER_BUILDX_PLATFORMS ?= linux/amd64
DIGITALOCEAN_ACCESS_TOKEN ?= dop_v1_REDACTED

# Targets
.PHONY: login build push build_and_deploy

# Login to Docker registry
login:
	@echo "Logging in to DigitalOcean Container Registry..."
	@echo "$(DIGITALOCEAN_ACCESS_TOKEN)" | docker login --username=doctl --password-stdin $(DOCKER_REGISTRY)

# Build the Docker image
build:
	@echo "Building Backend Docker image with BuildKit..."
	@docker build --no-cache --platform="$(DOCKER_BUILDX_PLATFORMS)" -t "$(IMAGE_NAME_BACKEND):$(IMAGE_TAG)" -f Dockerfile .

# Push the Docker image
push:
	@echo "Pushing Backend Docker image to DigitalOcean Container Registry..."
	@docker push "$(IMAGE_NAME_BACKEND):$(IMAGE_TAG)"

# Run all steps in sequence
build_and_deploy: login build push

# Help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  login   - Log in to the Docker registry"
	@echo "  build   - Build the Docker image"
	@echo "  push    - Push the Docker image to the registry"
	@echo "  build_and_deploy     - Run login, build, and push in sequence"
	@echo "  help    - Show this help message"
