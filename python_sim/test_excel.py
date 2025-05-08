import pandas as pd
import io
from export import model_to_excel

# Create a simple test model
test_model = {
    "name": "Test Model",
    "description": "A test model for Excel export",
    "nodes": [
        {
            "id": "node1",
            "data": {
                "label": "Node 1",
                "type": "regular",
                "value": 0.5,
                "color": "#3498db"
            },
            "position": {"x": 100, "y": 100}
        },
        {
            "id": "node2",
            "data": {
                "label": "Node 2",
                "type": "driver",
                "value": 0.8,
                "color": "#e74c3c"
            },
            "position": {"x": 200, "y": 200}
        }
    ],
    "edges": [
        {
            "id": "edge1",
            "source": "node1",
            "target": "node2",
            "data": {
                "weight": 0.7,
                "label": "Influences"
            }
        }
    ],
    "analysis": {
        "nodeCount": 2,
        "edgeCount": 1,
        "density": 0.5,
        "isConnected": True,
        "hasLoop": False,
        "degree_centrality": {
            "node1": 0.5,
            "node2": 0.5
        },
        "in_degree_centrality": {
            "node1": 0.0,
            "node2": 1.0
        },
        "out_degree_centrality": {
            "node1": 1.0,
            "node2": 0.0
        }
    }
}

# Generate Excel file
excel_data = model_to_excel(test_model)

# Save to file
with open("test_export.xlsx", "wb") as f:
    f.write(excel_data)

print("Excel file generated: test_export.xlsx") 