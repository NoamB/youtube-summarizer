#!/bin/bash

IMAGE_NAME="yt-summarizer"
CONTAINER_NAME="yt-summarizer-app"

# Stop and remove existing container if it exists
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

echo "Running Docker container: $IMAGE_NAME..."
# Map 8000 for backend and 5173 for frontend.
# We also pass the backend URL to the frontend environment.
docker run -d \
  --name $CONTAINER_NAME \
  -p 8000:8000 \
  -p 5173:5173 \
  --add-host=host.docker.internal:host-gateway \
  -e VITE_API_BASE_URL=http://localhost:8000 \
  -e OLLAMA_HOST=${OLLAMA_HOST:-host.docker.internal} \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  $IMAGE_NAME

if [ $? -eq 0 ]; then
    echo "Container started successfully!"
    echo "Frontend: http://localhost:5173"
    echo "Backend API: http://localhost:8000"
else
    echo "Failed to start container!"
    exit 1
fi
