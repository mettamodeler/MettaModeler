#!/bin/bash

# Production start script for MettaModeler
# This script starts both the Python Flask service and Node.js server
# For platforms like Render, Railway, or Fly.io

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default ports if not set in environment
export PYTHON_PORT=${PYTHON_PORT:-5050}
export NODE_PORT=${PORT:-3000}

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to start Python Flask service
start_python_service() {
    echo "[$(date)] Starting Python Flask service on port $PYTHON_PORT..."
    cd python_sim
    
    # Use virtual environment Python if it exists, otherwise use system python3
    PYTHON_CMD=${VENV_PYTHON:-/app/venv/bin/python3}
    if [ ! -f "$PYTHON_CMD" ]; then
        PYTHON_CMD=python3
    fi
    
    # Start Flask app in background
    # Flask will bind to 0.0.0.0 to accept connections from the Node.js service
    nohup $PYTHON_CMD app.py > ../logs/python.log 2>&1 &
    PYTHON_PID=$!
    cd ..
    
    echo "[$(date)] Python service started with PID: $PYTHON_PID"
    
    # Wait for Python service to be ready
    echo "[$(date)] Waiting for Python service to initialize..."
    sleep 3
    
    # Health check
    if curl -f http://localhost:$PYTHON_PORT/api/health > /dev/null 2>&1; then
        echo "[$(date)] ✅ Python service is ready"
    else
        echo "[$(date)] ⚠️  Python service health check failed, but continuing..."
    fi
}

# Function to handle shutdown
cleanup() {
    echo "[$(date)] Shutting down services..."
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGTERM SIGINT

# Run database migrations before starting services
echo "[$(date)] Running database migrations..."
if node dist/migrate.js; then
    echo "[$(date)] ✅ Migrations completed successfully"
else
    echo "[$(date)] ⚠️  Migration failed, but continuing (database may already be up to date)..."
fi

# Start Python service in background
start_python_service

# Start Node.js server (foreground - this keeps the container alive)
# The Node.js server serves both the API and the built frontend
echo "[$(date)] Starting Node.js server on port $NODE_PORT..."
node dist/index.js 