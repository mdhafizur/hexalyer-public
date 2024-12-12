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
	. $(VENV_DIR)/bin/activate && pyinstaller --onefile --name $(EXECUTABLE_NAME) $(SCRIPT)

# Target to build the Windows executable
build_agent_windows: build_clean setup
	. $(VENV_DIR)/bin/activate && pyinstaller --onefile --name $(EXECUTABLE_NAME).exe --windowed $(SCRIPT)

# Target to run the executable
run_agent: build
	./$(OUTPUT_DIR)/$(EXECUTABLE_NAME)


# Variables
PYLINT_TARGET ?= .          # Default to current directory if no target is provided
PYLINT_RCFILE ?= .pylintrc  # Use a custom .pylintrc file if it exists
PYLINT_REPORT ?= pylint-report.txt  # Save the pylint report to a file

# Run pylint
pylint:
	@echo "Running pylint on: $(PYLINT_TARGET)"
	@if [ -f $(PYLINT_RCFILE) ]; then \
		pylint --rcfile=$(PYLINT_RCFILE) $(PYLINT_TARGET) | tee $(PYLINT_REPORT); \
	else \
		pylint $(PYLINT_TARGET) | tee $(PYLINT_REPORT); \
	fi

# Clean pylint reports
clean-pylint:
	@echo "Cleaning pylint reports..."
	@rm -f $(PYLINT_REPORT)

# Setup commit linter
setup-commit-linter:
	npm install --save-dev husky @commitlint/{cli,config-conventional}
	npm run prepare
	echo 'npx --no -- commitlint --edit "$$1"' > .husky/commit-msg
	chmod +x .husky/commit-msg

# Run commitlint manually
commitlint:
	@echo "Linting commit message..."
	@commitlint --edit $(shell git rev-parse --git-dir)/COMMIT_EDITMSG || echo "Commit message does not follow conventional commit rules."