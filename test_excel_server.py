import requests
import json
import os
from datetime import datetime

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

# Send request to the Python service
print("Sending request to Python service...")
response = requests.post(
    "http://localhost:5050/api/export/excel",
    json={
        "data": sample_model,
        "type": "model"
    }
)

if response.status_code == 200:
    # Save the Excel file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"test_server_export_{timestamp}.xlsx"
    
    with open(filename, "wb") as f:
        f.write(response.content)
    
    print(f"Excel file saved as {filename}")
    print(f"Response headers: {response.headers}")
else:
    print(f"Error: {response.status_code}")
    print(response.text) 