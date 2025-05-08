#!/bin/bash

# Navigate to the python_sim directory
cd python_sim || exit 1

# Kill any existing Python processes using port 5050
lsof -ti:5050 | xargs kill -9 2>/dev/null || true

# Set environment variables
export PYTHON_SIM_PORT=5050

# Start the Python service
python app.py 