#!/bin/bash

# Start Backend
echo "Starting Backend..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# Start Frontend
echo "Starting Frontend..."
cd /app/frontend
# Ensure it listens on all interfaces so it's accessible from outside the container
npm run dev -- --host 0.0.0.0 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
