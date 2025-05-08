import sys
import os
import json
import io
from datetime import datetime

# Add the python_sim directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_sim'))

# Import the export functions
from export import model_to_excel

# Sample model data
sample_model = {
    "name": "Test Model",
    "description": "A test model for Excel export",
    "nodes": [
        {
            "id": "node1",
            "label": "Node 1",
            "type": "regular",
            "value": 0.5,
            "positionX": 100,
            "positionY": 100,
            "color": "#ff0000"
        },
        {
            "id": "node2",
            "label": "Node 2",
            "type": "regular",
            "value": 0.7,
            "positionX": 200,
            "positionY": 200,
            "color": "#00ff00"
        }
    ],
    "edges": [
        {
            "id": "edge1",
            "source": "node1",
            "target": "node2",
            "weight": 0.8,
            "label": "Connection"
        }
    ],
    "analysis": {
        "nodeCount": 2,
        "edgeCount": 1,
        "density": 0.5,
        "isConnected": True,
        "degree_centrality": {
            "node1": 1,
            "node2": 1
        },
        "betweenness_centrality": {
            "node1": 0,
            "node2": 0
        }
    }
}

# Generate Excel file
print("Generating Excel file...")
excel_data = model_to_excel(sample_model)
print(f"Excel data size: {len(excel_data)} bytes")

# Save to file
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"test_export_{timestamp}.xlsx"

with open(filename, "wb") as f:
    f.write(excel_data)

print(f"Excel file saved as {filename}") 