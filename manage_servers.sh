#!/bin/bash

# Define paths
PROJECT_ROOT=$(pwd)
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"
VENV_PYTHON="$PROJECT_ROOT/venv/bin/python3"
UVICORN_CMD="$PROJECT_ROOT/venv/bin/uvicorn backend.main:app --reload --port 8000"

start_servers() {
    echo "Starting servers..."

    # Start Backend
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        echo "Backend is already running (PID: $(cat "$BACKEND_PID_FILE"))"
    else
        echo "Starting Backend..."
        # Fetch Ollama models
        echo "Fetching available Ollama models..."
        $VENV_PYTHON "$PROJECT_ROOT/backend/fetch_ollama_models.py"

        # Explicitly overwrite log file
        > "$PROJECT_ROOT/backend.log"
        nohup $UVICORN_CMD > "$PROJECT_ROOT/backend.log" 2>&1 &
        echo $! > "$BACKEND_PID_FILE"
        echo "Backend started (PID: $(cat "$BACKEND_PID_FILE"))"
    fi

    # Start Frontend
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        echo "Frontend is already running (PID: $(cat "$FRONTEND_PID_FILE"))"
    else
        echo "Starting Frontend..."
        # Explicitly overwrite log file
        > "$PROJECT_ROOT/frontend.log"
        cd "$PROJECT_ROOT/frontend"
        nohup npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
        echo $! > "$FRONTEND_PID_FILE"
        cd "$PROJECT_ROOT"
        echo "Frontend started (PID: $(cat "$FRONTEND_PID_FILE"))"
    fi
}

stop_servers() {
    echo "Stopping servers..."

    # Stop Backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            echo "Stopping Backend (PID: $PID)..."
            kill $PID
            rm "$BACKEND_PID_FILE"
        else
            echo "Backend process $PID not found. Removing PID file."
            rm "$BACKEND_PID_FILE"
        fi
    else
        echo "Backend PID file not found."
    fi

    # Stop Frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            echo "Stopping Frontend (PID: $PID)..."
            kill $PID
            rm "$FRONTEND_PID_FILE"
        else
            echo "Frontend process $PID not found. Removing PID file."
            rm "$FRONTEND_PID_FILE"
        fi
    else
        echo "Frontend PID file not found."
    fi
}

case "$1" in
    start)
        start_servers
        ;;
    stop)
        stop_servers
        ;;
    restart)
        stop_servers
        sleep 2
        start_servers
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
