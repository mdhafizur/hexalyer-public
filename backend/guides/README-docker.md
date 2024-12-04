### Step 1: Build the Docker image with a meaningful tag
```bash
docker build -t hexalayer-backend:latest .
```

### Step 2: Run the container with named ports and environment variables
```bash
docker run -d \
  --name hexalayer-backend-container \
  --env-file .env \
  -p 6000:6000 \
  -p 6001:6001 \
  -p 6003:6003 \
  --rm \
  hexalayer-backend:latest
```