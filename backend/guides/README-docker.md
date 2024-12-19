### Step 1: Build the Docker image with a meaningful tag
```bash
docker build --platform linux/amd64 -t hexalayer-backend:latest .
```

### Step 2: Run the container with named ports and environment variables
```bash
docker run -d \
  --name hexalayer-backend-container \
  --platform linux/amd64 \
  --env-file .env \
  -p 5000:5000 \
  -p 5001:5001 \
  -p 5003:5003 \
  --rm \
  hexalayer-backend:latest

```