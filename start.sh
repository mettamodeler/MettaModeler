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
    
    # Set environment variable for Python service
    export PYTHON_SIM_PORT=$PYTHON_PORT
    
    # Start Flask app in background
    # Flask will bind to 0.0.0.0 to accept connections from the Node.js service
    nohup $PYTHON_CMD app.py > ../logs/python.log 2>&1 &
    PYTHON_PID=$!
    cd ..
    
    echo "[$(date)] Python service started with PID: $PYTHON_PID"
    
    # Wait for Python service to be ready (with retries)
    echo "[$(date)] Waiting for Python service to initialize..."
    MAX_RETRIES=10
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        sleep 1
        if curl -f http://localhost:$PYTHON_PORT/api/health > /dev/null 2>&1; then
            echo "[$(date)] ✅ Python service is ready"
            return 0
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "[$(date)] Waiting for Python service... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    done
    
    echo "[$(date)] ⚠️  Python service health check failed after $MAX_RETRIES attempts"
    echo "[$(date)] Checking Python service logs..."
    tail -n 20 ../logs/python.log || echo "No log file found"
    echo "[$(date)] Continuing anyway..."
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