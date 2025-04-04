from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from simulate import run_fcm_simulation, run_baseline_scenario_comparison
import json
import os
import traceback
import io
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/simulate', methods=['POST'])
def simulate():
    """
    Endpoint for running FCM simulations.
    
    Expected payload format:
    {
        "nodes": [{ "id": "...", "data": { "value": ..., "type": ... } }],
        "edges": [{ "source": "...", "target": "...", "data": { "weight": ... } }],
        "activation": "sigmoid", // or "tanh", "relu"
        "threshold": 0.001, // optional
        "maxIterations": 100, // optional
        "generateNotebook": false, // optional
        "compareToBaseline": false // optional
    }
    """
    try:
        data = request.get_json()
        
        # Extract parameters
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        activation = data.get('activation', 'sigmoid')
        threshold = data.get('threshold', 0.001)
        max_iterations = data.get('maxIterations', 100)
        generate_notebook = data.get('generateNotebook', False)
        compare_to_baseline = data.get('compareToBaseline', False)
        
        # Validate inputs
        if not nodes:
            return jsonify({'error': 'No nodes provided'}), 400
        
        if compare_to_baseline:
            # Create baseline scenario (original nodes with default values)
            # Get a deep copy of the original nodes
            baseline_nodes = []
            for node in nodes:
                baseline_node = {
                    'id': node['id'],
                    'data': {
                        **{k: v for k, v in node.get('data', {}).items() if k != 'value'},
                        'value': 0.0 if node['data'].get('type') != 'driver' else node['data'].get('value', 0.0)
                    }
                }
                baseline_nodes.append(baseline_node)
                
            # Run baseline simulation
            baseline_results = run_fcm_simulation(
                nodes=baseline_nodes,
                edges=edges,
                activation_function=activation,
                threshold=threshold,
                max_iterations=max_iterations,
                generate_notebook=False
            )
            
            # Run scenario simulation
            scenario_results = run_fcm_simulation(
                nodes=nodes,
                edges=edges,
                activation_function=activation,
                threshold=threshold,
                max_iterations=max_iterations,
                generate_notebook=generate_notebook
            )
            
            # Calculate delta between baseline and scenario
            baseline_final = baseline_results['finalState']
            scenario_final = scenario_results['finalState']
            
            # Calculate delta values (scenario - baseline)
            delta_values = {}
            for node_id in baseline_final:
                if node_id in scenario_final:
                    delta_values[node_id] = scenario_final[node_id] - baseline_final[node_id]
            
            # Convert Python boolean to JSON-serializable format
            scenario_converged = True if scenario_results['converged'] == True else False
            baseline_converged = True if baseline_results['converged'] == True else False
            
            # Combine results
            results = {
                # Standard scenario results
                'finalState': scenario_results['finalState'],
                'timeSeries': scenario_results['timeSeries'],
                'iterations': int(scenario_results['iterations']),
                'converged': scenario_converged,
                
                # Baseline and comparison data
                'baselineFinalState': baseline_results['finalState'],
                'baselineTimeSeries': baseline_results['timeSeries'],
                'baselineIterations': int(baseline_results['iterations']),
                'baselineConverged': baseline_converged,
                
                # Delta values
                'deltaState': delta_values,
            }
        else:
            # Run standard simulation
            sim_results = run_fcm_simulation(
                nodes=nodes,
                edges=edges,
                activation_function=activation,
                threshold=threshold,
                max_iterations=max_iterations,
                generate_notebook=generate_notebook
            )
            
            # Ensure boolean is serializable
            sim_converged = True if sim_results.get('converged') == True else False
            
            # Create properly serializable results
            results = {
                'finalState': sim_results['finalState'],
                'timeSeries': sim_results['timeSeries'],
                'iterations': int(sim_results['iterations']),
                'converged': sim_converged
            }
        
        # Return results
        return jsonify(results)
        
    except Exception as e:
        # Log error details
        print(f"Error in simulation: {str(e)}")
        traceback.print_exc()
        
        # Return error to client
        return jsonify({
            'error': 'Simulation failed',
            'message': str(e)
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
            print(f"Error calculating metrics: {str(e)}")
            traceback.print_exc()
            return jsonify({
                'error': 'Error calculating metrics',
                'message': str(e)
            }), 500
            
    except Exception as e:
        print(f"Error in analysis: {str(e)}")
        traceback.print_exc()
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
        # Import export functions here to avoid circular imports
        from export import generate_notebook
        
        data = request.get_json()
        
        # Extract parameters
        export_data = data.get('data', {})
        export_type = data.get('type', 'model')
        model_id = data.get('modelId')
        scenario_id = data.get('scenarioId')
        comparison_scenario_id = data.get('comparisonScenarioId')
        
        # Generate notebook
        notebook = generate_notebook(
            export_data, 
            export_type, 
            model_id, 
            scenario_id, 
            comparison_scenario_id
        )
        
        # Convert notebook to JSON string
        notebook_json = json.dumps(notebook)
        
        # Create a file-like object from the JSON string
        notebook_file = io.BytesIO(notebook_json.encode('utf-8'))
        
        # Set the file pointer to the beginning of the file
        notebook_file.seek(0)
        
        # Get the filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{export_type}_export_{timestamp}.ipynb"
        
        # Return the notebook file
        return send_file(
            notebook_file,
            mimetype='application/x-ipynb+json',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"Error generating notebook: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to generate notebook',
            'message': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    # Get port from environment or use 5050 as default
    port = int(os.environ.get('PYTHON_SIM_PORT', 5050))
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=port, debug=True)