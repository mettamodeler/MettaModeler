from flask import Flask, request, jsonify
from flask_cors import CORS
from simulate import run_fcm_simulation
import json
import os
import traceback

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
        "generateNotebook": false // optional
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
        
        # Validate inputs
        if not nodes:
            return jsonify({'error': 'No nodes provided'}), 400
            
        # Run simulation
        results = run_fcm_simulation(
            nodes=nodes,
            edges=edges,
            activation_function=activation,
            threshold=threshold,
            max_iterations=max_iterations,
            generate_notebook=generate_notebook
        )
        
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
            G.add_node(node['id'], **node.get('data', {}))
            
        # Add edges
        for edge in edges:
            G.add_edge(
                edge['source'], 
                edge['target'], 
                weight=edge['data'].get('weight', 0)
            )
            
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    # Get port from environment or use 5050 as default
    port = int(os.environ.get('PYTHON_SIM_PORT', 5050))
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=port, debug=True)