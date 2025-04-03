#!/bin/bash

# Set up Python simulation environment
echo "Setting up Python simulation environment..."

# Install required packages
echo "Installing required Python packages..."
python -m pip install numpy networkx matplotlib pandas seaborn nbformat flask flask-cors

echo "Python simulation setup complete!"
echo "You can now start the simulation service by running: python python_sim/app.py"