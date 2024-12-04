# Dockerfile

# Base image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy application files
COPY requirements.txt .
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the required ports
EXPOSE 6000
EXPOSE 6001
EXPOSE 6003

# Run the application
CMD ["python", "main.py"]
