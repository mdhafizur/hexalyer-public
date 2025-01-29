# Dockerfile

# Base image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY requirements.txt .
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the required ports (matches your server configurations)
EXPOSE 5000 5001 5003

# Create and set up start script
RUN echo '#!/bin/bash\n\
    uvicorn web_server.app:app --host 0.0.0.0 --port 5000 --reload &\n\
    uvicorn c2_server.app:app --host 0.0.0.0 --port 5001 --reload &\n\
    uvicorn c2_server.c2_socket_server:sio_app --host 0.0.0.0 --port 5003 --reload &\n\
    tail -f /dev/null' > start_servers.sh && \
    chmod +x start_servers.sh

# Run the servers
CMD ["./start_servers.sh"]
