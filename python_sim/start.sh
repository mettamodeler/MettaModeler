#!/bin/bash

# Start the Python simulation service

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "Python is not installed. Please make sure Python is available."
    exit 1
fi

# Check if required packages are installed, if not, run setup
if ! python -c "import numpy, networkx, flask, pandas" 2>/dev/null; then
    echo "Required packages not found. Running setup script..."
    ./setup.sh
fi

# Start the Flask application
echo "Starting the Python simulation service..."
python app.py