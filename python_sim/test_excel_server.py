import json
import io
from flask import Flask, request, jsonify, send_file
from export import model_to_excel

app = Flask(__name__)

@app.route('/api/export/excel', methods=['POST'])
def export_excel():
    """
    Export data to Excel format.
    """
    try:
        # Get data from request
        data = request.json.get('data')
        export_type = request.json.get('type')
        
        if not data or not export_type:
            return jsonify({
                'error': 'Missing required data',
                'message': 'Data and type are required'
            }), 400
        
        print(f"Exporting {export_type} to Excel")
        print(f"Data keys: {list(data.keys())}")
        
        # Generate Excel file based on type
        if export_type == 'model':
            print(f"Model nodes: {len(data.get('nodes', []))}")
            print(f"Model edges: {len(data.get('edges', []))}")
            print(f"Model analysis: {list(data.get('analysis', {}).keys())}")
            excel_data = model_to_excel(data)
        else:
            return jsonify({
                'error': 'Invalid export type',
                'message': f'Export type {export_type} not supported'
            }), 400
        
        # Create a file-like object from the Excel data
        excel_file = io.BytesIO(excel_data)
        excel_file.seek(0)
        
        # Return the Excel file
        return send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name="test_export_server.xlsx"
        )
        
    except Exception as e:
        print(f"Error generating Excel file: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to generate Excel file',
            'message': str(e)
        }), 500

# Create a test client
client = app.test_client()

# Create a test model
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

# Make a request to the export endpoint
response = client.post(
    '/api/export/excel',
    json={
        'data': test_model,
        'type': 'model'
    }
)

# Check if the response is successful
if response.status_code == 200:
    # Save the Excel file
    with open("test_export_server.xlsx", "wb") as f:
        f.write(response.data)
    print("Excel file generated: test_export_server.xlsx")
else:
    print(f"Error: {response.status_code}")
    print(response.json) 