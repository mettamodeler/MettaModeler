"""
Export utilities for MettaModeler Python service.
"""
import json
import os
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime

def transform_json_for_python(data):
    """
    Transform JSON data structure so it's compatible with Python.
    Replaces string 'true' and 'false' with Python booleans True and False.
    Handles nested dictionaries and lists recursively.
    
    Args:
        data: Any JSON-compatible data structure (dict, list, str, int, float, bool, None)
        
    Returns:
        Transformed data structure with proper Python types
    """
    if isinstance(data, dict):
        return {k: transform_json_for_python(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [transform_json_for_python(item) for item in data]
    elif data == "true" or data is True:
        return True
    elif data == "false" or data is False:
        return False
    elif data == "null" or data is None:
        return None
    elif isinstance(data, str):
        # Try to convert to numeric types if it's a numeric string
        try:
            if '.' in data:
                return float(data)
            else:
                try:
                    return int(data)
                except ValueError:
                    # Special case for activation functions
                    if data.lower() in ['sigmoid', 'tanh', 'relu']:
                        return data.lower()
                    return data
        except (ValueError, TypeError):
            return data
    else:
        return data

def generate_notebook(data: Dict, export_type: str, model_id: Optional[int] = None,
                     scenario_id: Optional[int] = None, comparison_scenario_id: Optional[int] = None) -> Dict:
    """
    Generate a Jupyter notebook with FCM model, scenario, or analysis data.
    
    Args:
        data: The data to include in the notebook
        export_type: Type of export ('model', 'scenario', 'analysis', 'comparison')
        model_id: Optional model ID for reference
        scenario_id: Optional scenario ID for reference 
        comparison_scenario_id: Optional second scenario ID for comparison exports
        
    Returns:
        Jupyter notebook as a dictionary
    """
    # First, transform data to use proper Python types
    transformed_data = transform_json_for_python(data)
    
    # Create a simple notebook structure
    notebook = {
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {
                    "name": "ipython",
                    "version": 3
                },
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbconvert_exporter": "python",
                "pygments_lexer": "ipython3",
                "version": "3.10.8"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5,
        "cells": [
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": [
                    f"# MettaModeler Export: {export_type.capitalize()}"
                ]
            },
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": [
                    f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                ]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    "import pandas as pd\n",
                    "import numpy as np\n",
                    "import matplotlib.pyplot as plt\n",
                    "import networkx as nx\n",
                    "import json\n",
                    "import seaborn as sns\n",
                    "from matplotlib.colors import LinearSegmentedColormap\n",
                    "\n",
                    "# Set plot style\n",
                    "plt.style.use('ggplot')\n",
                    "sns.set_context('talk')\n",
                    "plt.rcParams['figure.figsize'] = [12, 8]\n",
                    "plt.rcParams['figure.dpi'] = 100\n",
                    "\n",
                    "# Custom color maps for FCM visualization\n",
                    "node_cmap = LinearSegmentedColormap.from_list('node_cmap', ['#3498db', '#2ecc71', '#e74c3c'])\n",
                    "edge_cmap = LinearSegmentedColormap.from_list('edge_cmap', ['#e74c3c', '#95a5a6', '#2ecc71'])"
                ]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [
                    f"# Load data\n",
                    f"{export_type}_data = " + json.dumps(transformed_data, indent=2) + "\n",
                    "\n",
                    f"# Display basic information\n",
                    f"print(f\"Data type: {export_type}\")"
                ]
            }
        ]
    }
    
    # Add type-specific cells based on export type
    if export_type == 'model':
        # Add FCM visualization for models
        model_viz_code = """
# Create a NetworkX graph from the model data
G = nx.DiGraph()

# Add nodes
node_labels = {}
node_values = {}
node_colors = []
node_sizes = []

for node in model_data.get('nodes', []):
    node_id = node.get('id', '')
    node_data = node.get('data', {})
    
    G.add_node(node_id)
    
    # Store label for visualization
    node_labels[node_id] = node_data.get('label', node_id)
    
    # Store value for node color
    value = node_data.get('value', 0)
    node_values[node_id] = value
    
    # Node color based on type
    node_type = node_data.get('type', 'regular')
    if node_type == 'driver':
        node_colors.append('#e74c3c')  # Red for driver nodes
    elif node_type == 'output':
        node_colors.append('#2ecc71')  # Green for output nodes
    else:
        node_colors.append('#3498db')  # Blue for regular nodes
    
    # Node size
    node_sizes.append(300)  # Fixed size for now

# Add edges
edge_weights = []
for edge in model_data.get('edges', []):
    source = edge.get('source', '')
    target = edge.get('target', '')
    weight = edge.get('data', {}).get('weight', 0)
    
    G.add_edge(source, target, weight=weight)
    edge_weights.append(weight)

# Calculate position layout (can be adjusted based on preference)
pos = nx.spring_layout(G, k=0.3, seed=42)

plt.figure(figsize=(14, 10))

# Draw nodes
nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=node_sizes, alpha=0.8)

# Draw edges
edges = nx.draw_networkx_edges(
    G, pos, 
    width=2,
    edge_color=edge_weights,
    edge_cmap=edge_cmap,
    edge_vmin=-1,
    edge_vmax=1,
    arrowsize=20,
    connectionstyle='arc3,rad=0.1'
)

# Draw node labels
nx.draw_networkx_labels(G, pos, labels=node_labels, font_size=12, font_weight='bold')

# Draw edge labels if there aren't too many
if len(edge_weights) < 30:  # Skip if too cluttered
    edge_labels = {(u, v): f"{G[u][v]['weight']:.2f}" for u, v in G.edges()}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=10)

# Add colorbar for edge weights
sm = plt.cm.ScalarMappable(cmap=edge_cmap, norm=plt.Normalize(vmin=-1, vmax=1))
sm.set_array([])
cbar = plt.colorbar(sm, shrink=0.6)
cbar.set_label('Edge Weight')

plt.axis('off')
plt.title(f"FCM Model: {model_data.get('name', 'Untitled')}")
plt.tight_layout()
plt.show()

# Print basic model statistics
print(f"Model Name: {model_data.get('name', 'Untitled')}")
print(f"Description: {model_data.get('description', 'No description')}")
print(f"Number of nodes: {len(model_data.get('nodes', []))}")
print(f"Number of edges: {len(model_data.get('edges', []))}")
"""
        notebook["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": model_viz_code.strip().split('\n')
        })
        
        # Add network analysis function cell
        network_analysis_func_code = """
# Network Analysis Functions
def analyze_fcm(G):
    # Analyze FCM network properties
    metrics = {}
    
    # Basic graph properties
    metrics['node_count'] = G.number_of_nodes()
    metrics['edge_count'] = G.number_of_edges()
    metrics['density'] = nx.density(G)
    metrics['is_connected'] = nx.is_weakly_connected(G)
    
    # Check for cycles (feedback loops)
    try:
        cycles = list(nx.simple_cycles(G))
        metrics['has_cycles'] = len(cycles) > 0
        metrics['cycle_count'] = len(cycles)
    except:
        metrics['has_cycles'] = "Unknown"
        metrics['cycle_count'] = "Unknown"
    
    # Centrality measures
    metrics['degree_centrality'] = nx.degree_centrality(G)
    metrics['in_degree_centrality'] = nx.in_degree_centrality(G)
    metrics['out_degree_centrality'] = nx.out_degree_centrality(G)
    
    try:
        metrics['betweenness_centrality'] = nx.betweenness_centrality(G)
    except:
        metrics['betweenness_centrality'] = "Failed to compute"
    
    try:
        metrics['closeness_centrality'] = nx.closeness_centrality(G)
    except:
        metrics['closeness_centrality'] = "Failed to compute"
    
    return metrics
"""
        notebook["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": network_analysis_func_code.strip().split('\n')
        })
        
        # Add network analysis execution cell (separate cell for better execution)
        network_analysis_exec_code = """
# Perform network analysis
network_metrics = analyze_fcm(G)

# Print global metrics
print("=== Global Network Metrics ===")
for k, v in network_metrics.items():
    if not isinstance(v, dict):
        print(f"{k}: {v}")

# Display centrality metrics as DataFrames
centrality_metrics = {}

for metric_name, values in network_metrics.items():
    if isinstance(values, dict):
        for node, value in values.items():
            if node not in centrality_metrics:
                centrality_metrics[node] = {}
            centrality_metrics[node][metric_name] = value

# Create a DataFrame for centrality metrics
centrality_df = pd.DataFrame.from_dict(centrality_metrics, orient='index')
centrality_df.index.name = 'Node ID'
centrality_df = centrality_df.reset_index()

# Display table
display(centrality_df)
"""
        notebook["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": network_analysis_exec_code.strip().split('\n')
        })
        
        # Add visualization cell (separate for better rendering)
        network_viz_code = """
# Visualize top 5 nodes by different centrality measures
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
axes = axes.flatten()

metrics_to_plot = [col for col in centrality_df.columns if col != 'Node ID' and not isinstance(centrality_df[col].iloc[0], str)]

for i, metric in enumerate(metrics_to_plot[:4]):  # Plot up to 4 metrics
    # Sort and get top 5
    top_nodes = centrality_df.sort_values(by=metric, ascending=False).head(5)
    
    # Create the bar chart
    sns.barplot(x='Node ID', y=metric, data=top_nodes, ax=axes[i])
    axes[i].set_title(f'Top 5 Nodes by {metric}')
    axes[i].set_xticklabels(axes[i].get_xticklabels(), rotation=45, ha='right')

plt.tight_layout()
plt.show()
"""
        notebook["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": network_viz_code.strip().split('\n')
        })
        
    elif export_type == 'scenario':
        # Add scenario simulation visualization
        scenario_viz_code = """
# Extract model and simulation data
model_data = scenario_data.get('model', {})
nodes = scenario_data.get('nodes', [])
results = scenario_data.get('results', {})
iterations = results.get('iterations', [])
final_values = results.get('finalValues', {})

# Create a DataFrame for simulation results
sim_data = {}

# Initialize with node information
for node in nodes:
    node_id = node.get('id', '')
    node_data = node.get('data', {})
    label = node_data.get('label', node_id)
    
    sim_data[node_id] = {
        'label': label,
        'initial_value': node_data.get('value', 0),
        'type': node_data.get('type', 'regular')
    }

# Add final values
for node_id, value in final_values.items():
    if node_id in sim_data:
        sim_data[node_id]['final_value'] = value

# Create DataFrame
sim_df = pd.DataFrame.from_dict(sim_data, orient='index')
sim_df.index.name = 'Node ID'
sim_df = sim_df.reset_index()

# Display simulation parameters
print(f"Scenario: {scenario_data.get('name', 'Untitled Scenario')}")
print(f"Activation function: {scenario_data.get('activationFunction', 'sigmoid')}")
print(f"Threshold: {scenario_data.get('threshold', 0.001)}")
print(f"Max iterations: {scenario_data.get('maxIterations', 100)}")
print(f"Converged: {str(results.get('converged', False)).lower()}")
print(f"Iterations required: {len(iterations)}")

# Display table of initial and final values
display(sim_df)

# Plot iterations
if iterations:
    # Convert iterations to DataFrame for plotting
    iter_data = {}
    
    for node in nodes:
        node_id = node.get('id', '')
        node_data = node.get('data', {})
        label = node_data.get('label', node_id)
        
        values = [iter_values.get(node_id, 0) for iter_values in iterations]
        iter_data[label] = values
    
    # Create DataFrame
    iter_df = pd.DataFrame(iter_data)
    
    # Add iteration number
    iter_df.index.name = 'Iteration'
    iter_df.index = range(1, len(iter_df) + 1)
    
    # Plot
    plt.figure(figsize=(14, 8))
    for column in iter_df.columns:
        plt.plot(iter_df.index, iter_df[column], marker='o', label=column)
    
    plt.xlabel('Iteration')
    plt.ylabel('Node Value')
    plt.title('FCM Simulation Convergence')
    plt.grid(True)
    plt.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    plt.tight_layout()
    plt.show()

# Plot initial vs final values
plt.figure(figsize=(14, 8))

# Filter for visualization
vis_df = sim_df[['Node ID', 'label', 'initial_value', 'final_value']].copy()
vis_df = vis_df.sort_values(by='final_value', ascending=False)

# Get colors based on node type
colors = []
for _, row in vis_df.iterrows():
    node_type = row.get('type', 'regular')
    if node_type == 'driver':
        colors.append('#e74c3c')  # Red for driver nodes
    elif node_type == 'output':
        colors.append('#2ecc71')  # Green for output nodes
    else:
        colors.append('#3498db')  # Blue for regular nodes

# Create grouped bar chart
x = range(len(vis_df))
width = 0.35

fig, ax = plt.subplots(figsize=(14, 8))
ax.bar(x, vis_df['initial_value'], width, label='Initial Value', color='#3498db', alpha=0.7)
ax.bar([i + width for i in x], vis_df['final_value'], width, label='Final Value', color='#2ecc71', alpha=0.7)

# Add labels and title
ax.set_xlabel('Node')
ax.set_ylabel('Value')
ax.set_title('Initial vs Final Node Values')
ax.set_xticks([i + width/2 for i in x])
ax.set_xticklabels(vis_df['label'], rotation=45, ha='right')
ax.legend()

plt.tight_layout()
plt.show()

# If there's a baseline comparison
if 'baselineResults' in scenario_data:
    baseline = scenario_data['baselineResults']
    baseline_final = baseline.get('finalValues', {})
    
    # Create comparison DataFrame
    comparison = []
    
    for node in nodes:
        node_id = node.get('id', '')
        node_data = node.get('data', {})
        label = node_data.get('label', node_id)
        
        baseline_value = baseline_final.get(node_id, 0)
        scenario_value = final_values.get(node_id, 0)
        delta = scenario_value - baseline_value
        
        comparison.append({
            'Node ID': node_id,
            'Label': label,
            'Baseline Value': baseline_value,
            'Scenario Value': scenario_value,
            'Delta': delta,
            'Percent Change': (delta / baseline_value * 100) if baseline_value != 0 else float('inf')
        })
    
    comp_df = pd.DataFrame(comparison)
    comp_df = comp_df.sort_values(by='Delta', ascending=False)
    
    print("=== Baseline Comparison ===")
    display(comp_df)
    
    # Plot comparison
    plt.figure(figsize=(14, 8))
    
    # Plot deltas
    plt.bar(comp_df['Label'], comp_df['Delta'], color=['#2ecc71' if x > 0 else '#e74c3c' for x in comp_df['Delta']])
    
    plt.xlabel('Node')
    plt.ylabel('Change (Scenario - Baseline)')
    plt.title('Impact of Scenario vs Baseline')
    plt.xticks(rotation=45, ha='right')
    plt.grid(axis='y')
    plt.tight_layout()
    plt.show()
"""
        notebook["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": scenario_viz_code.strip().split('\n')
        })
        
    elif export_type == 'analysis':
        # Add network analysis visualization
        analysis_viz_code = """
# Extract network metrics
metrics = {}
centrality_metrics = {}

# Process metrics
for key, value in analysis_data.items():
    if isinstance(value, dict):
        # This is a centrality metric
        centrality_metrics[key] = value
    else:
        # This is a scalar metric
        metrics[key] = value

# Display scalar metrics
print("=== Global Network Metrics ===")
for k, v in metrics.items():
    print(f"{k}: {v}")

# Prepare centrality data for visualization
centrality_data = {}

for metric_name, values in centrality_metrics.items():
    for node, value in values.items():
        if node not in centrality_data:
            centrality_data[node] = {}
        centrality_data[node][metric_name] = value

# Create DataFrame for centrality metrics
centrality_df = pd.DataFrame.from_dict(centrality_data, orient='index')
centrality_df.index.name = 'Node ID'
centrality_df = centrality_df.reset_index()

# Display centrality metrics
display(centrality_df)

# Visualize top nodes by different centrality measures
centrality_metrics_list = list(centrality_metrics.keys())
if centrality_metrics_list:
    # Determine how many plots to create
    n_metrics = min(4, len(centrality_metrics_list))
    n_cols = 2
    n_rows = (n_metrics + 1) // 2
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(14, 4 * n_rows))
    if n_metrics == 1:
        axes = [axes]
    else:
        axes = axes.flatten()
    
    for i, metric in enumerate(centrality_metrics_list[:n_metrics]):
        # Get top 5 nodes by this metric
        top_data = {node: value for node, value in centrality_metrics[metric].items()}
        top_data = dict(sorted(top_data.items(), key=lambda x: x[1], reverse=True)[:5])
        
        # Create bar plot
        sns.barplot(x=list(top_data.keys()), y=list(top_data.values()), ax=axes[i])
        axes[i].set_title(f'Top 5 Nodes by {metric}')
        axes[i].set_xlabel('Node ID')
        axes[i].set_ylabel(metric)
        axes[i].set_xticklabels(axes[i].get_xticklabels(), rotation=45, ha='right')
    
    # Hide any unused axes
    for i in range(n_metrics, len(axes)):
        axes[i].axis('off')
    
    plt.tight_layout()
    plt.show()
"""
        notebook["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": analysis_viz_code.strip().split('\n')
        })
        
    elif export_type == 'comparison':
        # Add comparison visualization
        comparison_viz_code = """
# Extract comparison data
scenario1 = comparison_data.get('scenario1', {})
scenario2 = comparison_data.get('scenario2', {})
delta = comparison_data.get('delta', {})

# Display scenario information
print(f"Scenario 1: {scenario1.get('name', 'Unnamed')}")
print(f"Scenario 2: {scenario2.get('name', 'Unnamed')}")

# Create comparison DataFrame
comparison = []

# Get all node IDs from both scenarios
all_nodes = set()
all_nodes.update(scenario1.get('finalValues', {}).keys())
all_nodes.update(scenario2.get('finalValues', {}).keys())

# Get node labels if available
node_labels = {}
for scenario in [scenario1, scenario2]:
    if 'nodes' in scenario:
        for node in scenario.get('nodes', []):
            node_id = node.get('id', '')
            label = node.get('data', {}).get('label', node_id)
            node_labels[node_id] = label

# Build comparison data
for node_id in all_nodes:
    s1_value = scenario1.get('finalValues', {}).get(node_id, 0)
    s2_value = scenario2.get('finalValues', {}).get(node_id, 0)
    delta_value = s2_value - s1_value
    
    comparison.append({
        'Node ID': node_id,
        'Label': node_labels.get(node_id, node_id),
        'Scenario 1 Value': s1_value,
        'Scenario 2 Value': s2_value,
        'Delta': delta_value,
        'Percent Change': (delta_value / s1_value * 100) if s1_value != 0 else float('inf')
    })

# Convert to DataFrame
comp_df = pd.DataFrame(comparison)
comp_df = comp_df.sort_values(by='Delta', ascending=False)

# Display table
display(comp_df)

# Plot comparison
plt.figure(figsize=(14, 8))

# Sort for better visualization
plot_df = comp_df.sort_values(by='Delta', ascending=False)

# Plot values side by side
x = range(len(plot_df))
width = 0.35

fig, ax = plt.subplots(figsize=(14, 8))
ax.bar(x, plot_df['Scenario 1 Value'], width, label=f'Scenario 1: {scenario1.get("name", "Unnamed")}', color='#3498db')
ax.bar([i + width for i in x], plot_df['Scenario 2 Value'], width, label=f'Scenario 2: {scenario2.get("name", "Unnamed")}', color='#2ecc71')

# Add labels and title
ax.set_xlabel('Node')
ax.set_ylabel('Value')
ax.set_title('Scenario Comparison')
ax.set_xticks([i + width/2 for i in x])
ax.set_xticklabels(plot_df['Label'], rotation=45, ha='right')
ax.legend()

plt.tight_layout()
plt.show()

# Plot delta values
plt.figure(figsize=(14, 8))

# Plot deltas
plt.bar(plot_df['Label'], plot_df['Delta'], color=['#2ecc71' if x > 0 else '#e74c3c' for x in plot_df['Delta']])

plt.xlabel('Node')
plt.ylabel('Change (Scenario 2 - Scenario 1)')
plt.title('Impact Difference Between Scenarios')
plt.xticks(rotation=45, ha='right')
plt.grid(axis='y')
plt.tight_layout()
plt.show()

# Plot convergence if available
if 'iterations' in scenario1 and 'iterations' in scenario2:
    # Get iterations data
    iter1 = scenario1.get('iterations', [])
    iter2 = scenario2.get('iterations', [])
    
    # Get a few key nodes to compare
    key_nodes = list(all_nodes)[:5]  # First 5 nodes
    
    for node_id in key_nodes:
        plt.figure(figsize=(10, 6))
        
        # Plot scenario 1 iterations
        values1 = [iter_values.get(node_id, 0) for iter_values in iter1]
        values2 = [iter_values.get(node_id, 0) for iter_values in iter2]
        
        plt.plot(range(1, len(values1) + 1), values1, 'o-', label=f'Scenario 1: {scenario1.get("name", "Unnamed")}')
        plt.plot(range(1, len(values2) + 1), values2, 'o-', label=f'Scenario 2: {scenario2.get("name", "Unnamed")}')
        
        plt.xlabel('Iteration')
        plt.ylabel('Value')
        plt.title(f'Convergence Comparison for Node {node_labels.get(node_id, node_id)}')
        plt.grid(True)
        plt.legend()
        plt.tight_layout()
        plt.show()
"""
        notebook["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": comparison_viz_code.strip().split('\n')
        })
    
    # Add a cell with export data as JSON
    export_code = (
        "# Export the data to JSON\n"
        "with open('export_data.json', 'w') as f:\n"
        f"    json.dump({export_type}_data, f, indent=2)\n"
        "\n"
        "print('Data exported to export_data.json')"
    )
    notebook["cells"].append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [export_code]
    })
    
    return notebook

def model_to_excel(model: Dict) -> bytes:
    """
    Convert a model to Excel format.
    
    Args:
        model: The model to convert
        
    Returns:
        Excel file as bytes
    """
    import pandas as pd
    import io
    
    output = io.BytesIO()
    
    # Print debug info
    print(f"Processing model for Excel export: {model.get('name', 'Unnamed')}")
    print(f"Model has {len(model.get('nodes', []))} nodes and {len(model.get('edges', []))} edges")
    
    # Create Excel writer
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Model info sheet
        model_info = pd.DataFrame([
            {"Property": "Name", "Value": model.get("name", "")},
            {"Property": "Description", "Value": model.get("description", "")},
            {"Property": "Node Count", "Value": len(model.get("nodes", []))},
            {"Property": "Edge Count", "Value": len(model.get("edges", []))},
        ])
        model_info.to_excel(writer, sheet_name="Model Info", index=False)
        
        # Nodes sheet
        if "nodes" in model and model["nodes"]:
            nodes_data = []
            for node in model["nodes"]:
                # Handle both direct format and ReactFlow format
                if "data" in node and isinstance(node["data"], dict):
                    # ReactFlow format
                    node_data = node.get("data", {})
                    position = node.get("position", {})
                    pos_x = position.get("x", 0) if isinstance(position, dict) else 0
                    pos_y = position.get("y", 0) if isinstance(position, dict) else 0
                    
                    nodes_data.append({
                        "ID": node.get("id", ""),
                        "Label": node_data.get("label", ""),
                        "Type": node_data.get("type", ""),
                        "Value": node_data.get("value", 0),
                        "Position X": pos_x,
                        "Position Y": pos_y,
                    })
                else:
                    # Direct format (matching FCMNode schema)
                    nodes_data.append({
                        "ID": node.get("id", ""),
                        "Label": node.get("label", ""),
                        "Type": node.get("type", "regular"),
                        "Value": node.get("value", 0),
                        "Position X": node.get("positionX", 0),
                        "Position Y": node.get("positionY", 0),
                    })
            
            print(f"Processed {len(nodes_data)} nodes for Excel export")
            nodes_df = pd.DataFrame(nodes_data)
            nodes_df.to_excel(writer, sheet_name="Nodes", index=False)
        
        # Edges sheet
        if "edges" in model and model["edges"]:
            edges_data = []
            for edge in model["edges"]:
                # Handle both direct format and ReactFlow format
                if "data" in edge and isinstance(edge["data"], dict):
                    # ReactFlow format
                    edge_data = edge.get("data", {})
                    
                    edges_data.append({
                        "ID": edge.get("id", ""),
                        "Source": edge.get("source", ""),
                        "Target": edge.get("target", ""),
                        "Weight": edge_data.get("weight", 0),
                    })
                else:
                    # Direct format (matching FCMEdge schema)
                    edges_data.append({
                        "ID": edge.get("id", ""),
                        "Source": edge.get("source", ""),
                        "Target": edge.get("target", ""),
                        "Weight": edge.get("weight", 0),
                    })
            
            edges_df = pd.DataFrame(edges_data)
            edges_df.to_excel(writer, sheet_name="Edges", index=False)
        
        # Add network analysis if available
        if "analysis" in model and model["analysis"]:
            # Global metrics sheet
            global_metrics = []
            
            for key, value in model["analysis"].items():
                if not isinstance(value, dict):
                    global_metrics.append({
                        "Metric": key,
                        "Value": value
                    })
            
            if global_metrics:
                metrics_df = pd.DataFrame(global_metrics)
                metrics_df.to_excel(writer, sheet_name="Network Metrics", index=False)
            
            # Centrality metrics
            centrality_data = []
            
            # Get all centrality metrics
            centrality_metrics = {
                key: value for key, value in model["analysis"].items() 
                if isinstance(value, dict) and key in [
                    "degree_centrality", "in_degree_centrality", "out_degree_centrality",
                    "betweenness_centrality", "closeness_centrality"
                ]
            }
            
            # Process centrality metrics
            for node_id in set(sum([list(metric.keys()) for metric in centrality_metrics.values()], [])):
                node_data = {"Node ID": node_id}
                
                for metric_name, metric_values in centrality_metrics.items():
                    node_data[metric_name] = metric_values.get(node_id, 0)
                
                centrality_data.append(node_data)
                
            if centrality_data:
                centrality_df = pd.DataFrame(centrality_data)
                centrality_df.to_excel(writer, sheet_name="Centrality Metrics", index=False)
            
            # Other network metrics
            for metric_name, metric_data in model["analysis"].items():
                if isinstance(metric_data, dict) and metric_name not in centrality_metrics:
                    try:
                        metric_df = pd.DataFrame([
                            {"Node ID": node_id, "Value": value}
                            for node_id, value in metric_data.items()
                        ])
                        sheet_name = f"{metric_name.replace('_', ' ').title()}"
                        metric_df.to_excel(writer, sheet_name=sheet_name[:31], index=False)  # Excel sheet name limit
                    except Exception as e:
                        print(f"Error creating sheet for {metric_name}: {str(e)}")
                        continue
    
        output.seek(0)
        return output.getvalue()

def scenario_to_excel(scenario: Dict) -> bytes:
    """
    Convert a scenario to Excel format.
    
    Args:
        scenario: The scenario to convert
        
    Returns:
        Excel file as bytes
    """
    import pandas as pd
    import io
    
    output = io.BytesIO()
    
    # Create Excel writer
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Scenario info sheet
        scenario_info = pd.DataFrame([
            {"Property": "Name", "Value": scenario.get("name", "")},
            {"Property": "Description", "Value": scenario.get("description", "")},
            {"Property": "Model ID", "Value": scenario.get("modelId", "")},
            {"Property": "Activation Function", "Value": scenario.get("activationFunction", "sigmoid")},
            {"Property": "Threshold", "Value": scenario.get("threshold", 0.001)},
            {"Property": "Max Iterations", "Value": scenario.get("maxIterations", 100)},
        ])
        scenario_info.to_excel(writer, sheet_name="Scenario Info", index=False)
        
        # Initial node values
        if "nodes" in scenario and scenario["nodes"]:
            initial_values = []
            for node in scenario["nodes"]:
                node_data = node.get("data", {})
                initial_values.append({
                    "Node ID": node.get("id", ""),
                    "Label": node_data.get("label", ""),
                    "Initial Value": node_data.get("value", 0),
                    "Type": node_data.get("type", ""),
                })
            
            initial_df = pd.DataFrame(initial_values)
            initial_df.to_excel(writer, sheet_name="Initial Values", index=False)
        
        # Simulation results
        if "results" in scenario and scenario["results"]:
            results = scenario["results"]
            
            # Iterations
            if "iterations" in results and results["iterations"]:
                iterations_data = []
                
                # Convert iterations to a format suitable for Excel
                for iter_num, iter_values in enumerate(results["iterations"]):
                    for node_id, value in iter_values.items():
                        iterations_data.append({
                            "Iteration": iter_num + 1,
                            "Node ID": node_id,
                            "Value": value
                        })
                
                if iterations_data:
                    iterations_df = pd.DataFrame(iterations_data)
                    iterations_df.to_excel(writer, sheet_name="Iterations", index=False)
            
            # Final values
            if "finalValues" in results and results["finalValues"]:
                final_values = []
                for node_id, value in results["finalValues"].items():
                    final_values.append({
                        "Node ID": node_id,
                        "Final Value": value
                    })
                
                if final_values:
                    final_df = pd.DataFrame(final_values)
                    final_df.to_excel(writer, sheet_name="Final Values", index=False)
            
            # Convergence info
            if "converged" in results or "iterations" in results:
                convergence_info = pd.DataFrame([
                    {"Property": "Converged", "Value": str(results.get("converged", False)).lower()},
                    {"Property": "Iterations Required", "Value": len(results.get("iterations", []))},
                    {"Property": "Delta", "Value": results.get("delta", 0)},
                ])
                convergence_info.to_excel(writer, sheet_name="Convergence", index=False)
        
        # If there's a baseline comparison in the scenario
        if "baselineResults" in scenario and scenario["baselineResults"]:
            baseline = scenario["baselineResults"]
            
            # Baseline final values
            if "finalValues" in baseline and baseline["finalValues"]:
                baseline_values = []
                for node_id, value in baseline["finalValues"].items():
                    baseline_values.append({
                        "Node ID": node_id,
                        "Baseline Value": value
                    })
                
                if baseline_values:
                    baseline_df = pd.DataFrame(baseline_values)
                    baseline_df.to_excel(writer, sheet_name="Baseline Values", index=False)
            
            # Delta comparison
            if "finalValues" in baseline and "results" in scenario and "finalValues" in scenario["results"]:
                results = scenario["results"]  # Ensure results is defined
                baseline_final = baseline["finalValues"]
                scenario_final = results["finalValues"]
                
                comparison = []
                for node_id in set(baseline_final.keys()) | set(scenario_final.keys()):
                    baseline_value = baseline_final.get(node_id, 0)
                    scenario_value = scenario_final.get(node_id, 0)
                    delta = scenario_value - baseline_value
                    
                    comparison.append({
                        "Node ID": node_id,
                        "Baseline Value": baseline_value,
                        "Scenario Value": scenario_value,
                        "Delta": delta,
                        "Percent Change": (delta / baseline_value * 100) if baseline_value != 0 else float('inf')
                    })
                
                if comparison:
                    comparison_df = pd.DataFrame(comparison)
                    comparison_df.to_excel(writer, sheet_name="Comparison", index=False)
    
    output.seek(0)
    return output.getvalue()

def analysis_to_excel(analysis: Dict) -> bytes:
    """
    Convert analysis data to Excel format.
    
    Args:
        analysis: The analysis data to convert
        
    Returns:
        Excel file as bytes
    """
    import pandas as pd
    import io
    
    output = io.BytesIO()
    
    # Create Excel writer
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Basic metrics
        basic_metrics = {}
        
        # Extract basic metrics (non-dictionary values)
        for key, value in analysis.items():
            if not isinstance(value, dict):
                basic_metrics[key] = value
        
        if basic_metrics:
            metrics_df = pd.DataFrame([
                {"Metric": k, "Value": v} for k, v in basic_metrics.items()
            ])
            metrics_df.to_excel(writer, sheet_name="Network Metrics", index=False)
        
        # Process centrality metrics if available
        for metric_name, metric_data in analysis.items():
            if isinstance(metric_data, dict):
                # Convert centrality dictionaries to dataframes
                metric_df = pd.DataFrame([
                    {"Node ID": node_id, f"{metric_name}": value} 
                    for node_id, value in metric_data.items()
                ])
                
                if not metric_df.empty:
                    # Sanitize sheet name (remove spaces, special chars)
                    sheet_name = metric_name.replace(' ', '_')[:31]  # Excel sheet names limited to 31 chars
                    metric_df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        # Create a combined centrality sheet
        combined_centrality = {}
        
        for metric_name, metric_data in analysis.items():
            if isinstance(metric_data, dict):
                for node_id, value in metric_data.items():
                    if node_id not in combined_centrality:
                        combined_centrality[node_id] = {}
                    combined_centrality[node_id][metric_name] = value
        
        if combined_centrality:
            # Convert the combined centrality data to a dataframe
            combined_rows = []
            for node_id, metrics in combined_centrality.items():
                row = {"Node ID": node_id}
                row.update(metrics)
                combined_rows.append(row)
            
            combined_df = pd.DataFrame(combined_rows)
            combined_df.to_excel(writer, sheet_name="Centrality Metrics", index=False)
    
    output.seek(0)
    return output.getvalue()

def export_to_json(data: Dict) -> bytes:
    """
    Convert data to JSON format.
    
    Args:
        data: The data to convert
        
    Returns:
        JSON file as bytes
    """
    # Transform data to ensure consistent Python boolean types
    transformed_data = transform_json_for_python(data)
    return json.dumps(transformed_data, indent=2).encode('utf-8')

def export_to_csv(data: Dict, export_type: str) -> bytes:
    """
    Convert data to CSV format.
    
    Args:
        data: The data to convert
        export_type: Type of export ('model', 'scenario', 'analysis', 'comparison')
        
    Returns:
        CSV file as bytes
    """
    # Transform data to ensure consistent Python boolean types
    transformed_data = transform_json_for_python(data)
    
    # Simple stub for now - returns JSON instead of CSV
    # When CSV implementation is added, still use the transformed_data
    return json.dumps(transformed_data, indent=2).encode('utf-8')