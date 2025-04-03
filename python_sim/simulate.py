import numpy as np
import networkx as nx
import json
from typing import Dict, List, Literal, Optional, Tuple, Union
import pandas as pd

def sigmoid(x: float) -> float:
    """Sigmoid activation function."""
    return 1 / (1 + np.exp(-x))

def tanh(x: float) -> float:
    """Hyperbolic tangent activation function."""
    return np.tanh(x)

def relu(x: float) -> float:
    """ReLU activation function."""
    return max(0, x)

class FCMSimulator:
    """Fuzzy Cognitive Map simulator using NumPy and NetworkX."""
    
    def __init__(
        self, 
        nodes: List[Dict], 
        edges: List[Dict], 
        activation_function: Literal["sigmoid", "tanh", "relu"] = "sigmoid",
        threshold: float = 0.001,
        max_iterations: int = 100
    ):
        self.nodes = nodes
        self.edges = edges
        self.threshold = threshold
        self.max_iterations = max_iterations
        
        # Set activation function
        if activation_function == "sigmoid":
            self.activation = sigmoid
        elif activation_function == "tanh":
            self.activation = tanh
        elif activation_function == "relu":
            self.activation = relu
        else:
            raise ValueError(f"Unknown activation function: {activation_function}")
        
        # Create a directed graph
        self.graph = nx.DiGraph()
        
        # Add nodes to the graph
        for node in self.nodes:
            self.graph.add_node(node["id"], value=node["data"]["value"], label=node["data"].get("label", ""))
        
        # Add edges to the graph
        for edge in self.edges:
            self.graph.add_edge(
                edge["source"], 
                edge["target"], 
                weight=edge["data"]["weight"]
            )
            
        # Get initial state
        self.initial_state = {node["id"]: node["data"]["value"] for node in self.nodes}

    def run_simulation(self) -> Dict:
        """Run FCM simulation until convergence or max iterations."""
        # Initialize time series data with initial state
        time_series = {node_id: [value] for node_id, value in self.initial_state.items()}
        
        # Create adjacency matrix
        node_ids = list(self.graph.nodes())
        n = len(node_ids)
        adjacency_matrix = np.zeros((n, n))
        
        # Map node IDs to indices
        node_to_index = {node_id: i for i, node_id in enumerate(node_ids)}
        
        # Fill adjacency matrix
        for u, v, data in self.graph.edges(data=True):
            adjacency_matrix[node_to_index[u], node_to_index[v]] = data['weight']
            
        # Initial state vector
        state_vector = np.array([self.initial_state[node_id] for node_id in node_ids])
        
        # Run simulation
        converged = False
        iteration = 0
        
        while not converged and iteration < self.max_iterations:
            iteration += 1
            
            # Calculate new state: S(t+1) = f(S(t) * W)
            new_state_vector = np.copy(state_vector)
            
            for i in range(n):
                # Calculate weighted sum of inputs
                weighted_sum = np.dot(state_vector, adjacency_matrix[:, i])
                
                # Apply activation function
                new_state_vector[i] = self.activation(weighted_sum)
            
            # Check for convergence
            diff = np.abs(new_state_vector - state_vector).max()
            converged = diff < self.threshold
            
            # Update state vector
            state_vector = new_state_vector
            
            # Record state for time series
            for i, node_id in enumerate(node_ids):
                time_series[node_id].append(float(state_vector[i]))
        
        # Create final state
        final_state = {node_id: float(state_vector[i]) for i, node_id in enumerate(node_ids)}
        
        # Return results
        return {
            "timeSeries": time_series,
            "finalState": final_state,
            "iterations": iteration,
            "converged": converged
        }
    
    def generate_notebook(self, title: str = "FCM Simulation Analysis") -> dict:
        """Generate a Jupyter notebook with simulation results."""
        import nbformat as nbf
        
        # Run simulation to get results
        results = self.run_simulation()
        
        # Create a new notebook
        nb = nbf.v4.new_notebook()
        
        # Add title cell
        nb.cells.append(nbf.v4.new_markdown_cell(f"# {title}"))
        
        # Add description
        nb.cells.append(nbf.v4.new_markdown_cell("""
        This notebook contains an analysis of a Fuzzy Cognitive Map (FCM) simulation.
        
        ## Model Description
        
        The model consists of nodes (concepts) connected by weighted edges (causal relationships).
        """))
        
        # Add code cell for setup and imports
        nb.cells.append(nbf.v4.new_code_cell("""
        import numpy as np
        import pandas as pd
        import matplotlib.pyplot as plt
        import networkx as nx
        import seaborn as sns
        
        # Set plot style
        plt.style.use('ggplot')
        sns.set(style="darkgrid")
        """))
        
        # Add model data
        nodes_str = json.dumps(self.nodes, indent=2)
        edges_str = json.dumps(self.edges, indent=2)
        
        nb.cells.append(nbf.v4.new_code_cell(f"""
        # Model data
        nodes = {nodes_str}
        edges = {edges_str}
        
        # Create node information dataframe
        node_df = pd.DataFrame([
            {{"id": node["id"], 
              "label": node["data"].get("label", ""), 
              "initial_value": node["data"]["value"],
              "type": node["data"].get("type", "regular")
            }} for node in nodes
        ])
        
        # Display node information
        print("Node Information:")
        display(node_df)
        """))
        
        # Add network visualization
        nb.cells.append(nbf.v4.new_code_cell("""
        # Create a directed graph
        G = nx.DiGraph()
        
        # Add nodes to the graph
        for node in nodes:
            G.add_node(node["id"], label=node["data"].get("label", ""), value=node["data"]["value"])
        
        # Add edges to the graph
        for edge in edges:
            G.add_edge(
                edge["source"], 
                edge["target"], 
                weight=edge["data"]["weight"]
            )
            
        # Plot the network
        plt.figure(figsize=(12, 10))
        pos = nx.spring_layout(G, seed=42)
        
        # Node labels
        labels = {node["id"]: node["data"].get("label", node["id"]) for node in nodes}
        
        # Edge weights
        edge_weights = [G[u][v]["weight"] for u, v in G.edges()]
        
        # Create a colormap for edges: red for positive, blue for negative
        edge_colors = ["red" if w > 0 else "blue" for w in edge_weights]
        
        # Draw the network
        nx.draw_networkx_nodes(G, pos, node_size=700, alpha=0.8)
        nx.draw_networkx_labels(G, pos, labels=labels, font_size=12)
        nx.draw_networkx_edges(
            G, pos, width=2, alpha=0.7, 
            edge_color=edge_colors,
            connectionstyle="arc3,rad=0.1",
            arrowsize=20
        )
        
        # Add edge labels (weights)
        edge_labels = {(u, v): f"{G[u][v]['weight']:.2f}" for u, v in G.edges()}
        nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=10)
        
        plt.title("Fuzzy Cognitive Map Network", fontsize=16)
        plt.axis("off")
        plt.tight_layout()
        plt.show()
        """))
        
        # Add time series visualization
        time_series_str = json.dumps(results["timeSeries"], indent=2)
        
        nb.cells.append(nbf.v4.new_code_cell(f"""
        # Simulation results
        time_series = {time_series_str}
        final_state = {json.dumps(results["finalState"], indent=2)}
        iterations = {results["iterations"]}
        converged = {results["converged"]}
        
        # Convert time series to DataFrame
        df = pd.DataFrame(time_series)
        
        # Plot time series
        plt.figure(figsize=(12, 6))
        for column in df.columns:
            # Get the label for this node
            node_label = next((node["data"].get("label", column) for node in nodes if node["id"] == column), column)
            plt.plot(df[column], marker='o', markersize=4, label=node_label)
            
        plt.title(f"FCM Simulation Convergence (Iterations: {iterations}, Converged: {converged})", fontsize=15)
        plt.xlabel("Iteration", fontsize=12)
        plt.ylabel("Node Value", fontsize=12)
        plt.grid(True, alpha=0.3)
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()
        plt.show()
        """))
        
        # Add final state analysis
        nb.cells.append(nbf.v4.new_code_cell("""
        # Analyze final state
        final_df = pd.DataFrame([
            {"id": node_id, 
             "label": next((node["data"].get("label", node_id) for node in nodes if node["id"] == node_id), node_id),
             "initial_value": next((node["data"]["value"] for node in nodes if node["id"] == node_id), 0),
             "final_value": final_state[node_id],
             "change": final_state[node_id] - next((node["data"]["value"] for node in nodes if node["id"] == node_id), 0)
            } for node_id in final_state.keys()
        ])
        
        # Sort by absolute change
        final_df["abs_change"] = final_df["change"].abs()
        final_df = final_df.sort_values("abs_change", ascending=False)
        final_df = final_df.drop("abs_change", axis=1)
        
        print("Final State Analysis:")
        display(final_df)
        
        # Plot initial vs final values
        plt.figure(figsize=(10, 6))
        
        x = range(len(final_df))
        width = 0.35
        
        plt.bar(x, final_df["initial_value"], width, label="Initial Value", alpha=0.7)
        plt.bar([i + width for i in x], final_df["final_value"], width, label="Final Value", alpha=0.7)
        
        plt.xlabel("Node", fontsize=12)
        plt.ylabel("Value", fontsize=12)
        plt.title("Initial vs Final Node Values", fontsize=15)
        plt.xticks([i + width/2 for i in x], final_df["label"], rotation=45, ha="right")
        plt.legend()
        plt.tight_layout()
        plt.show()
        """))
        
        # Add network analysis
        nb.cells.append(nbf.v4.new_code_cell("""
        # Network Analysis
        print("Network Statistics:")
        print(f"Number of nodes: {G.number_of_nodes()}")
        print(f"Number of edges: {G.number_of_edges()}")
        print(f"Network density: {nx.density(G):.4f}")
        
        # Calculate centrality measures
        degree_centrality = nx.degree_centrality(G)
        in_degree_centrality = nx.in_degree_centrality(G)
        out_degree_centrality = nx.out_degree_centrality(G)
        betweenness_centrality = nx.betweenness_centrality(G)
        
        # Create centrality dataframe
        centrality_df = pd.DataFrame({
            "Node": list(G.nodes()),
            "Degree": list(degree_centrality.values()),
            "In-Degree": list(in_degree_centrality.values()),
            "Out-Degree": list(out_degree_centrality.values()),
            "Betweenness": list(betweenness_centrality.values())
        })
        
        # Add node labels
        centrality_df["Label"] = centrality_df["Node"].apply(
            lambda x: next((node["data"].get("label", x) for node in nodes if node["id"] == x), x)
        )
        
        # Sort by degree centrality
        centrality_df = centrality_df.sort_values("Degree", ascending=False)
        
        print("\\nCentrality Analysis:")
        display(centrality_df)
        
        # Plot centrality measures
        plt.figure(figsize=(14, 6))
        
        plt.subplot(1, 2, 1)
        plt.bar(centrality_df["Label"], centrality_df["In-Degree"], alpha=0.7, label="In-Degree")
        plt.bar(centrality_df["Label"], centrality_df["Out-Degree"], alpha=0.7, label="Out-Degree", bottom=centrality_df["In-Degree"])
        plt.xticks(rotation=45, ha="right")
        plt.ylabel("Centrality")
        plt.title("In/Out Degree Centrality")
        plt.legend()
        
        plt.subplot(1, 2, 2)
        plt.bar(centrality_df["Label"], centrality_df["Betweenness"], alpha=0.7, color="green")
        plt.xticks(rotation=45, ha="right")
        plt.ylabel("Centrality")
        plt.title("Betweenness Centrality")
        
        plt.tight_layout()
        plt.show()
        """))
        
        # Add adjacency matrix visualization
        nb.cells.append(nbf.v4.new_code_cell("""
        # Create and visualize adjacency matrix
        adj_matrix = nx.to_numpy_array(G, nodelist=list(G.nodes()))
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            adj_matrix, 
            cmap="RdBu_r", 
            center=0,
            annot=True, 
            fmt=".2f",
            xticklabels=[labels[node] for node in G.nodes()],
            yticklabels=[labels[node] for node in G.nodes()],
            cbar_kws={"label": "Edge Weight"}
        )
        plt.title("FCM Adjacency Matrix", fontsize=15)
        plt.tight_layout()
        plt.show()
        """))
        
        # Return the notebook
        return nb

def run_fcm_simulation(
    nodes: List[Dict], 
    edges: List[Dict], 
    activation_function: str = "sigmoid",
    threshold: float = 0.001,
    max_iterations: int = 100,
    generate_notebook: bool = False
) -> Dict:
    """
    Run FCM simulation with the given nodes and edges.
    
    Args:
        nodes: List of node objects with id and data properties
        edges: List of edge objects with source, target and data properties
        activation_function: Activation function to use (sigmoid, tanh, relu)
        threshold: Convergence threshold
        max_iterations: Maximum number of iterations
        generate_notebook: Whether to generate a Jupyter notebook
        
    Returns:
        Dict with simulation results
    """
    # Create simulator
    simulator = FCMSimulator(
        nodes=nodes,
        edges=edges,
        activation_function=activation_function,
        threshold=threshold,
        max_iterations=max_iterations
    )
    
    # Run simulation
    results = simulator.run_simulation()
    
    # Generate notebook if requested
    if generate_notebook:
        nb = simulator.generate_notebook()
        results["notebook"] = nbf.v4.writes(nb)
    
    return results


def run_baseline_scenario_comparison(
    nodes: List[Dict], 
    edges: List[Dict], 
    activation_function: str = "sigmoid",
    threshold: float = 0.001,
    max_iterations: int = 100,
    generate_notebook: bool = False
) -> Dict:
    """
    Run a baseline simulation and compare it with a scenario simulation.
    
    This function creates two simulations:
    1. Baseline: Using the original node values
    2. Scenario: Using the provided node values (which may have been modified by the user)
    
    Args:
        nodes: List of node objects with id and data properties (for scenario)
        edges: List of edge objects with source, target and data properties
        activation_function: Activation function to use (sigmoid, tanh, relu)
        threshold: Convergence threshold
        max_iterations: Maximum number of iterations
        generate_notebook: Whether to generate a Jupyter notebook
        
    Returns:
        Dict with simulation results including baseline, scenario, and delta values
    """
    # Create baseline nodes (reset all node values to their default state)
    baseline_nodes = []
    for node in nodes:
        # Create a deep copy of the node to avoid modifying the original
        baseline_node = {
            'id': node['id'],
            'data': {
                # Take all properties from the original node except 'value'
                **{k: v for k, v in node.get('data', {}).items() if k != 'value'},
                # For baseline, we use a default value of 0 for all nodes
                # This represents the "no intervention" state
                'value': 0.0 if node['data'].get('type') != 'driver' else node['data'].get('value', 0.0)
            }
        }
        baseline_nodes.append(baseline_node)
    
    # Run baseline simulation
    baseline_simulator = FCMSimulator(
        nodes=baseline_nodes,
        edges=edges,
        activation_function=activation_function,
        threshold=threshold,
        max_iterations=max_iterations
    )
    baseline_results = baseline_simulator.run_simulation()
    
    # Run scenario simulation
    scenario_simulator = FCMSimulator(
        nodes=nodes,
        edges=edges,
        activation_function=activation_function,
        threshold=threshold,
        max_iterations=max_iterations
    )
    scenario_results = scenario_simulator.run_simulation()
    
    # Calculate delta between baseline and scenario
    baseline_final = baseline_results['finalState']
    scenario_final = scenario_results['finalState']
    
    # Calculate delta values (scenario - baseline)
    delta_values = {}
    for node_id in baseline_final:
        if node_id in scenario_final:
            delta_values[node_id] = scenario_final[node_id] - baseline_final[node_id]
    
    # Combine results
    combined_results = {
        # Standard scenario results
        'finalState': scenario_results['finalState'],
        'timeSeries': scenario_results['timeSeries'],
        'iterations': scenario_results['iterations'],
        'converged': scenario_results['converged'],
        
        # Baseline and comparison data
        'baselineFinalState': baseline_results['finalState'],
        'baselineTimeSeries': baseline_results['timeSeries'],
        'baselineIterations': baseline_results['iterations'],
        'baselineConverged': baseline_results['converged'],
        
        # Delta values
        'deltaState': delta_values,
    }
    
    # Generate notebook if requested
    if generate_notebook:
        nb = scenario_simulator.generate_notebook()
        combined_results["notebook"] = nbf.v4.writes(nb)
    
    return combined_results