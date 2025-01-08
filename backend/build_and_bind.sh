#!/bin/bash

# Check if a bind value is provided
if [ -z "$1" ]; then
    echo "Error: No BIND_VALUE provided. Usage: ./build_and_bind.sh <BIND_VALUE>"
    exit 1
fi

BIND_VALUE=$1
echo "Building app with BIND_VALUE=${BIND_VALUE}"

# Create the bind_value file
echo "${BIND_VALUE}" > bind_value.txt

# Build the app with a fixed name
pyinstaller --onefile --add-data "bind_value.txt:." --name "agent_app" agent/agent_ui_app.py

# Check if the build was successful
if [ $? -ne 0 ]; then
    echo "Error: Build failed."
    exit 1
fi

# Rename and move the executable for download
EXECUTABLE="agent_app_${BIND_VALUE}"
if [ -f dist/agent_app ]; then
    mv dist/agent_app "dist/${EXECUTABLE}"
else
    echo "Error: Executable 'dist/agent_app' not found."
    exit 1
fi

# Create a ZIP file containing the executable
cd dist || exit
if [ -f "${EXECUTABLE}" ]; then
    zip "${EXECUTABLE}.zip" "${EXECUTABLE}"
else
    echo "Error: Executable '${EXECUTABLE}' not found. Cannot create ZIP file."
    exit 1
fi

# Provide feedback
if [ $? -eq 0 ]; then
    echo "Build and ZIP successful. Files are located in the 'dist' directory:"
    echo "Executable: ${EXECUTABLE}"
    echo "ZIP File: ${EXECUTABLE}.zip"
else
    echo "Error: Failed to create ZIP file."
    exit 1
fi
