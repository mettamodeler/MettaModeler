#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default ports if not set in environment
export PYTHON_PORT=${PYTHON_PORT:-5050}
export FRONTEND_PORT=${PORT:-3000}  # Use Render's PORT variable

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to start Python service
start_python_service() {
    echo "[$(date)] Starting Python simulation service on port $PYTHON_PORT..."
    cd python_sim
    # Use nohup to keep the process running and redirect output
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port $PYTHON_PORT > ../logs/python.log 2>&1 &
    PYTHON_PID=$!
    cd ..
    echo "[$(date)] Python service started with PID: $PYTHON_PID"
}

# Function to start frontend service
start_frontend() {
    echo "[$(date)] Starting frontend service on port $FRONTEND_PORT..."
    cd client
    # Use nohup to keep the process running and redirect output
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    echo "[$(date)] Frontend service started with PID: $FRONTEND_PID"
}

# Function to handle shutdown
cleanup() {
    echo "[$(date)] Shutting down services..."
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGTERM SIGINT

# Start services
start_python_service
start_frontend

echo "[$(date)] All services started. Check logs/ directory for output."

# Keep script running
wait 