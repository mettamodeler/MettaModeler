from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from simulate import run_simulation, run_baseline_scenario_comparison, normalize_input_data
from export import generate_notebook, transform_json_for_python, model_to_excel, scenario_to_excel, analysis_to_excel
from typing import Dict, List, Union, TypedDict, Literal
import json
import os
import traceback
import io
from datetime import datetime
import nbformat
from simulation_schema import SimulationInputSchema
import logging
from pydantic import ValidationError

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/simulate', methods=['POST'])
def simulate():
    """Run FCM simulation with validated input."""
    try:
        data = request.get_json()
        logging.info("Received simulation request: %s", json.dumps(data, indent=2))

        # Validate and parse input using SimulationInputSchema
        sim_input = SimulationInputSchema.model_validate(data)

        # Extract both sets of initial values if present
        model_initial_values = data.get('modelInitialValues', {})
        scenario_initial_values = data.get('scenarioInitialValues', {})

        # Prepare arguments for simulation logic
        sim_args = sim_input.model_dump()

        # Run appropriate simulation based on compareToBaseline flag
        if sim_input.compareToBaseline:
            results = run_baseline_scenario_comparison(
                nodes=sim_args['nodes'],
                edges=sim_args['edges'],
                activation_function=sim_args.get('activation', 'sigmoid'),
                threshold=sim_args.get('threshold', 0.001),
                max_iterations=sim_args.get('maxIterations', 100),
                model_initial_values=model_initial_values,
                scenario_initial_values=scenario_initial_values,
                clamped_nodes=sim_args.get('clampedNodes', [])
            )
        else:
            results = run_simulation(
                nodes=sim_args['nodes'],
                edges=sim_args['edges'],
                activation_function=sim_args.get('activation', 'sigmoid'),
                threshold=sim_args.get('threshold', 0.001),
                max_iterations=sim_args.get('maxIterations', 100),
                clamped_nodes=sim_args.get('clampedNodes', [])
            )

        # Return simulation results
        return jsonify(results)

    except ValidationError as e:
        return jsonify({
            "status": 400,
            "code": "INVALID_PAYLOAD",
            "fieldErrors": e.errors()
        }), 400
    except Exception as e:
        logging.error(f"Error in simulation: {str(e)}")
        logging.error(f"Error type: {type(e).__name__}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Simulation failed',
            'message': str(e),
        }), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Endpoint for analyzing FCM network properties.
    
    Expected payload format:
    {
        "nodes": [{ "id": "...", "data": { "value": ..., "type": ... } }],
        "edges": [{ "source": "...", "target": "...", "data": { "weight": ... } }]
    }
    """
    try:
        import networkx as nx
        import numpy as np
        
        data = request.get_json()
        
        # Extract parameters
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        
        # Normalize input data
        nodes = normalize_input_data(nodes)
        edges = normalize_input_data(edges)
        
        logging.info(f"Analyze nodes count: {len(nodes)}")
        logging.info(f"Analyze edges count: {len(edges)}")
        
        # Validate inputs
        if not nodes:
            return jsonify({'error': 'No nodes provided'}), 400
            
        # Create graph
        G = nx.DiGraph()
        
        # Add nodes
        for node in nodes:
            # Handle different node formats safely
            node_id = node.get('id', '')
            
            # Handle node data attributes
            node_attrs = {}
            if 'data' in node and isinstance(node['data'], dict):
                node_attrs = node['data']
            elif isinstance(node, dict):
                # Copy all other properties except 'id' as attributes
                node_attrs = {k: v for k, v in node.items() if k != 'id'}
                
            if node_id:  # Ensure we have a valid node id
                G.add_node(node_id, **node_attrs)
            
        # Add edges
        for edge in edges:
            # Handle different edge data formats safely
            source = edge.get('source', '')
            target = edge.get('target', '')
            
            # Handle both formats of edge data
            # Format 1: edge['data']['weight']
            # Format 2: edge['weight']
            if 'data' in edge and isinstance(edge['data'], dict):
                weight = edge['data'].get('weight', 0)
            elif 'weight' in edge:
                weight = edge.get('weight', 0)
            else:
                weight = 0
                
            if source and target:  # Ensure we have valid source and target
                G.add_edge(source, target, weight=weight)
            
        # Calculate network metrics
        try:
            # Basic metrics
            metrics = {
                'nodeCount': G.number_of_nodes(),
                'edgeCount': G.number_of_edges(),
                'density': nx.density(G),
                'isConnected': nx.is_weakly_connected(G),
                'hasLoop': len(list(nx.simple_cycles(G))) > 0,
            }
            
            # Centrality measures
            centrality = {
                'degree': nx.degree_centrality(G),
                'inDegree': nx.in_degree_centrality(G),
                'outDegree': nx.out_degree_centrality(G),
                'betweenness': nx.betweenness_centrality(G),
                'closeness': nx.closeness_centrality(G),
            }
            
            # Format centrality results
            formatted_centrality = {}
            for measure, values in centrality.items():
                formatted_centrality[measure] = {node: float(value) for node, value in values.items()}
                
            # Add to results
            metrics['centrality'] = formatted_centrality
            
            # Create adjacency matrix
            node_ids = list(G.nodes())
            adj_matrix = nx.to_numpy_array(G, nodelist=node_ids)
            
            # Convert to list of lists for JSON serialization
            metrics['adjacencyMatrix'] = adj_matrix.tolist()
            metrics['nodeIds'] = node_ids
            
            return jsonify(metrics)
            
        except Exception as e:
            logging.error(f"Error calculating metrics: {str(e)}")
            logging.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({
                'error': 'Error calculating metrics',
                'message': str(e)
            }), 500
            
    except Exception as e:
        logging.error(f"Error in analysis: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Analysis failed',
            'message': str(e)
        }), 500

@app.route('/api/export/notebook', methods=['POST'])
def export_notebook():
    """
    Endpoint for exporting data as a Jupyter notebook.
    
    Expected payload format:
    {
        "data": { ... }, // The data to export (model, scenario, or analysis)
        "type": "model", // Type of data: "model", "scenario", "analysis", or "comparison"
        "modelId": 123,  // Optional model ID for reference
        "scenarioId": 456, // Optional scenario ID for reference
        "comparisonScenarioId": 789 // Optional comparison scenario ID for reference
    }
    """
    try:
        data = request.get_json()
        
        # Extract parameters
        export_data = data.get('data', {})
        export_type = data.get('type', 'model')
        model_id = data.get('modelId')
        scenario_id = data.get('scenarioId')
        comparison_scenario_id = data.get('comparisonScenarioId')
        
        # For the generate_notebook function, data must be a Dictionary
        # But for safety, let's wrap this in an explicit dictionary for type safety
        if not isinstance(export_data, dict):
            logging.warning(f"Warning: export_data is not a dictionary, converting to wrapped dict. Type: {type(export_data)}")
            # Wrap non-dict data in a dictionary with a 'data' key
            export_data = {'data': export_data}
        else:
            # Apply transform_json_for_python to convert JS/TS data types to Python while preserving dict structure
            export_data = transform_json_for_python(export_data)
        
        if not isinstance(export_type, str):
            export_type = 'model'
        else:
            export_type = normalize_input_data(export_type)
        
        # Convert IDs to integers if they are provided
        model_id_int = int(model_id) if model_id is not None else None
        scenario_id_int = int(scenario_id) if scenario_id is not None else None
        comparison_scenario_id_int = int(comparison_scenario_id) if comparison_scenario_id is not None else None
        
        # Generate notebook
        notebook = generate_notebook(
            data=export_data, 
            export_type=export_type, 
            model_id=model_id_int, 
            scenario_id=scenario_id_int, 
            comparison_scenario_id=comparison_scenario_id_int
        )
        
        # Get the filename
        if export_type == 'model':
            # Use model name if available, fallback to timestamp if not
            model_name = export_data.get('name', '').strip()
            if model_name:
                # Replace spaces with underscores and remove special characters
                safe_name = ''.join(c if c.isalnum() or c in ' _-' else '' for c in model_name)
                safe_name = safe_name.replace(' ', '_')
                filename = f"{safe_name}.ipynb"
            else:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"model_export_{timestamp}.ipynb"
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{export_type}_export_{timestamp}.ipynb"
        
        # Convert notebook to proper format using nbformat
        nb = nbformat.from_dict(notebook)
        notebook_json = nbformat.writes(nb)
        
        # Create a file-like object from the notebook JSON
        notebook_file = io.BytesIO(notebook_json.encode('utf-8'))
        notebook_file.seek(0)
        
        # Return the notebook file
        return send_file(
            notebook_file,
            mimetype='application/x-ipynb+json',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logging.error(f"Error generating notebook: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Failed to generate notebook',
            'message': str(e)
        }), 500

@app.route('/api/export/excel', methods=['POST'])
def export_excel():
    try:
        data = request.json.get('data')
        export_type = request.json.get('type')
        file_name = request.json.get('fileName')
        
        logging.info(f"[FILENAME DEBUG] Received fileName from request: {file_name}")
        
        if not data or not export_type:
            return jsonify({'error': 'Missing required data'}), 400

        # Convert model to Excel format
        if export_type == 'model':
            output = model_to_excel(data)
        elif export_type == 'scenario':
            output = scenario_to_excel(data)
        elif export_type == 'analysis':
            output = analysis_to_excel(data)
        else:
            return jsonify({'error': f'Invalid export type: {export_type}'}), 400

        # Ensure .xlsx extension
        filename = file_name if file_name else 'export'
        if not filename.endswith('.xlsx'):
            filename = f"{filename}.xlsx"
        
        logging.info(f"[FILENAME DEBUG] Using final filename: {filename}")
        
        # Return Excel file
        output.seek(0)
        response = send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        logging.info(f"[FILENAME DEBUG] Response headers: {dict(response.headers)}")
        return response

    except Exception as e:
        logging.error(f"Error in export_excel: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    # Get port from environment or use 5050 as default
    port = int(os.environ.get('PYTHON_SIM_PORT', 5050))
    
    # Run the Flask app
    logging.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
