# Define variables
SCRIPT = agent/main.py
OUTPUT_DIR = dist
BUILD_DIR = build
EXECUTABLE_NAME = agent
PYTHON_PATH = $(shell which python3)

# Command to generate requirements.txt
gen_req:
	$(PYTHON_PATH) -m pip freeze > requirements.txt

# Target to clean up previous builds (only removes the specified agent file, .spec file, and build folder)
build_clean_linux:
	rm -rf $(BUILD_DIR)/$(EXECUTABLE_NAME)_linux $(OUTPUT_DIR)/$(EXECUTABLE_NAME)_linux $(EXECUTABLE_NAME)_linux.spec

build_clean_darwin:
	rm -rf $(BUILD_DIR)/$(EXECUTABLE_NAME)_darwin $(OUTPUT_DIR)/$(EXECUTABLE_NAME)_darwin $(EXECUTABLE_NAME)_darwin.spec

build_clean_windows:
	rm -rf $(BUILD_DIR)/$(EXECUTABLE_NAME)_windows $(OUTPUT_DIR)/$(EXECUTABLE_NAME)_windows.exe $(EXECUTABLE_NAME)_windows.spec

# Target to build the executable for Linux
build_agent_linux: build_clean_linux
	USER_ID=$(USER_ID) CONVERSATION_ID=$(CONVERSATION_ID) $(PYTHON_PATH) -m PyInstaller --onefile --name $(EXECUTABLE_NAME)_linux $(SCRIPT)

# Target to build the executable for macOS (ARM/M1/M2)
build_agent_darwin: build_clean_darwin
	USER_ID=$(USER_ID) CONVERSATION_ID=$(CONVERSATION_ID) arch -arm64 $(PYTHON_PATH) -m PyInstaller --onefile --name $(EXECUTABLE_NAME)_darwin $(SCRIPT)

# Target to build the executable for Windows
build_agent_windows: build_clean_windows
	USER_ID=$(USER_ID) CONVERSATION_ID=$(CONVERSATION_ID) $(PYTHON_PATH) -m PyInstaller --onefile --name $(EXECUTABLE_NAME)_windows.exe $(SCRIPT)

# Target to run the Linux agent executable
run_agent_linux:
	./$(OUTPUT_DIR)/$(EXECUTABLE_NAME)_linux

# Target to run the macOS agent executable
run_agent_macos:
	./$(OUTPUT_DIR)/$(EXECUTABLE_NAME)_darwin

# Target to run the Windows agent executable (via Wine on Unix-like systems)
run_agent_windows:
	wine $(OUTPUT_DIR)/$(EXECUTABLE_NAME)_windows.exe

# Target to build the UI application
build_agent_app:
	$(PYTHON_PATH) -m PyInstaller --onefile --windowed agent/agent_ui_app.py && zip -r $(OUTPUT_DIR)/agent_ui_app.zip agent_ui_app.app






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
