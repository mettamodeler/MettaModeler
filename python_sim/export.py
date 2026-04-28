"""
Export utilities for MettaModeler Python service.
"""
import json
import os
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime
import traceback
import io
import pandas as pd
import nbformat as nbf
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell

def _extract_graph_payload(export_type: str, payload: Dict) -> Tuple[List[Dict], List[Dict]]:
    """Best-effort extraction of graph nodes/edges from model/scenario/comparison payloads."""
    if export_type == "model":
        return payload.get("nodes", []) or [], payload.get("edges", []) or []

    if export_type == "scenario":
        model = payload.get("model", {}) if isinstance(payload.get("model"), dict) else {}
        nodes = payload.get("nodes") or model.get("nodes") or []
        edges = payload.get("edges") or model.get("edges") or []
        return nodes, edges

    if export_type == "comparison":
        primary = payload.get("scenario", {}) if isinstance(payload.get("scenario"), dict) else {}
        baseline = payload.get("baselineScenario", {}) if isinstance(payload.get("baselineScenario"), dict) else {}
        primary_nodes = primary.get("nodes", []) or []
        baseline_nodes = baseline.get("nodes", []) or []
        primary_edges = primary.get("edges", []) or []
        baseline_edges = baseline.get("edges", []) or []
        # Prefer primary scenario graph; fallback to baseline if empty.
        return (primary_nodes or baseline_nodes), (primary_edges or baseline_edges)

    # analysis or unknown types
    return payload.get("nodes", []) or [], payload.get("edges", []) or []


def _type_specific_notebook_cells(notebook, export_type: str):
    """Append export-type specific analysis helpers and visuals."""
    if export_type == "model":
        notebook.cells.append(new_markdown_cell(
            "## Model Analysis\n"
            "This section builds graph visualizations, computes centrality metrics, and provides quick simulation helpers."
        ))
    elif export_type == "scenario":
        notebook.cells.append(new_markdown_cell(
            "## Scenario Analysis\n"
            "This section summarizes scenario parameters/results and compares final values with baseline results when available."
        ))
        scenario_code = [
            "scenario_meta = scenario_data if 'scenario_data' in globals() else {}",
            "results = scenario_meta.get('results', {}) if isinstance(scenario_meta, dict) else {}",
            "baseline_results = scenario_meta.get('baselineResults', {}) if isinstance(scenario_meta, dict) else {}",
            "",
            "print('Scenario name:', scenario_meta.get('name', 'Unnamed'))",
            "print('Max iterations:', scenario_meta.get('maxIterations', 'n/a'))",
            "print('Threshold:', scenario_meta.get('threshold', 'n/a'))",
            "print('Converged:', results.get('converged', 'unknown'))",
            "",
            "final_values = results.get('finalValues', {}) if isinstance(results, dict) else {}",
            "baseline_final = baseline_results.get('finalValues', {}) if isinstance(baseline_results, dict) else {}",
            "if final_values:",
            "    scenario_final_df = pd.DataFrame([{'nodeId': k, 'scenarioValue': v} for k, v in final_values.items()])",
            "    display(scenario_final_df.sort_values('scenarioValue', ascending=False).head(15))",
            "",
            "if final_values and baseline_final:",
            "    node_ids = sorted(set(final_values.keys()) | set(baseline_final.keys()))",
            "    rows = []",
            "    for node_id in node_ids:",
            "        s_val = float(final_values.get(node_id, 0))",
            "        b_val = float(baseline_final.get(node_id, 0))",
            "        rows.append({",
            "            'nodeId': node_id,",
            "            'baselineValue': b_val,",
            "            'scenarioValue': s_val,",
            "            'delta': s_val - b_val,",
            "        })",
            "    scenario_delta_df = pd.DataFrame(rows).sort_values('delta', ascending=False)",
            "    display(scenario_delta_df.head(20))",
            "    scenario_delta_df.head(20).plot.bar(x='nodeId', y='delta', title='Top scenario deltas vs baseline')",
            "    plt.tight_layout()",
            "    plt.show()",
        ]
        notebook.cells.append(new_code_cell("\n".join(scenario_code)))
    elif export_type == "comparison":
        notebook.cells.append(new_markdown_cell(
            "## Comparison Analysis\n"
            "This section computes node-level deltas between two scenarios and visualizes largest shifts."
        ))
        comparison_code = [
            "comparison_meta = comparison_data if 'comparison_data' in globals() else {}",
            "left = comparison_meta.get('scenario', {}) if isinstance(comparison_meta, dict) else {}",
            "right = comparison_meta.get('baselineScenario', {}) if isinstance(comparison_meta, dict) else {}",
            "",
            "left_values = left.get('results', {}).get('finalValues', {}) if isinstance(left, dict) else {}",
            "right_values = right.get('results', {}).get('finalValues', {}) if isinstance(right, dict) else {}",
            "",
            "node_ids = sorted(set(left_values.keys()) | set(right_values.keys()))",
            "comparison_rows = []",
            "for node_id in node_ids:",
            "    current_value = float(left_values.get(node_id, 0))",
            "    baseline_value = float(right_values.get(node_id, 0))",
            "    delta = current_value - baseline_value",
            "    comparison_rows.append({",
            "        'nodeId': node_id,",
            "        'currentValue': current_value,",
            "        'baselineValue': baseline_value,",
            "        'delta': delta,",
            "        'absDelta': abs(delta),",
            "    })",
            "",
            "comparison_df = pd.DataFrame(comparison_rows).sort_values('absDelta', ascending=False)",
            "display(comparison_df.head(25))",
            "comparison_df.head(20).plot.bar(x='nodeId', y='delta', title='Top absolute changes')",
            "plt.tight_layout()",
            "plt.show()",
        ]
        notebook.cells.append(new_code_cell("\n".join(comparison_code)))

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
    """Generate a Jupyter notebook with FCM model, scenario, or analysis data."""
    # Create notebook structure
    notebook = new_notebook()
    
    # Add title and timestamp
    notebook.cells.append(new_markdown_cell(f"# MettaModeler Export: {export_type.capitalize()}"))
    notebook.cells.append(new_markdown_cell(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"))
    
    # Add imports cell
    imports = [
        "import pandas as pd",
        "import numpy as np", 
        "import matplotlib.pyplot as plt",
        "import networkx as nx",
        "import json",
        "import seaborn as sns",
        "from matplotlib.colors import LinearSegmentedColormap",
        "",
        "# Set plot style",
        "plt.style.use('ggplot')",
        "sns.set_context('talk')",
        "plt.rcParams['figure.figsize'] = [12, 8]",
        "plt.rcParams['figure.dpi'] = 100",
        "",
        "# Custom color maps",
        "node_cmap = LinearSegmentedColormap.from_list('node_cmap', ['#3498db', '#2ecc71', '#e74c3c'])",
                    "edge_cmap = LinearSegmentedColormap.from_list('edge_cmap', ['#e74c3c', '#95a5a6', '#2ecc71'])"
                ]
    
    notebook.cells.append(new_code_cell("\n".join(imports)))

    notebook.cells.append(new_markdown_cell(
        "## Notebook Workflow\n"
        "1. Validate and inspect data\n"
        "2. Build graph objects and summary tables\n"
        "3. Run/modify simulation helpers\n"
        "4. Export analysis artifacts"
    ))

    env_check_code = [
        "# Environment check",
        "import importlib",
        "required_packages = ['pandas', 'numpy', 'matplotlib', 'networkx', 'seaborn']",
        "missing_packages = []",
        "for pkg in required_packages:",
        "    if importlib.util.find_spec(pkg) is None:",
        "        missing_packages.append(pkg)",
        "",
        "if missing_packages:",
        "    print('Missing packages:', ', '.join(missing_packages))",
        "    print('Install with: pip install ' + ' '.join(missing_packages))",
        "else:",
        "    print('Environment looks ready')",
    ]
    notebook.cells.append(new_code_cell("\n".join(env_check_code)))
    
    # Add data cell with properly formatted JSON, but only include necessary model data
    if export_type == 'model':
        raw_model_data = {
            'name': data.get('name', 'Untitled'),
            'description': data.get('description', ''),
            'nodes': data.get('nodes', []),
            'edges': data.get('edges', [])
        }
        # Transform the data to use proper Python types
        model_data = transform_json_for_python(raw_model_data)
    else:
        # Transform the data to use proper Python types
        model_data = transform_json_for_python(data)
        
    data_cell = [
        f"# Load {export_type} data",
        f"{export_type}_data = {json.dumps(model_data, indent=2)}",
        "",
        "# Display basic information",
        f"print(f\"Data type: {export_type}\")"
    ]
    
    notebook.cells.append(new_code_cell("\n".join(data_cell)))

    extracted_nodes, extracted_edges = _extract_graph_payload(export_type, model_data)
    validation_and_tables = [
        "# Validate payload and create analysis tables",
        f"assert isinstance({export_type}_data, dict), 'Export payload must be a dictionary'",
        "",
        f"nodes = {json.dumps(extracted_nodes, indent=2)}",
        f"edges = {json.dumps(extracted_edges, indent=2)}",
        "",
        "if nodes:",
        "    required_node_keys = {'id', 'label', 'type', 'value'}",
        "    for node in nodes:",
        "        missing = required_node_keys.difference(set(node.keys()))",
        "        if missing:",
        "            raise ValueError(f\"Node {node.get('id')} missing keys: {missing}\")",
        "",
        "if edges:",
        "    required_edge_keys = {'source', 'target', 'weight'}",
        "    for edge in edges:",
        "        missing = required_edge_keys.difference(set(edge.keys()))",
        "        if missing:",
        "            raise ValueError(f\"Edge {edge.get('id')} missing keys: {missing}\")",
        "",
        "nodes_df = pd.DataFrame(nodes) if nodes else pd.DataFrame()",
        "edges_df = pd.DataFrame(edges) if edges else pd.DataFrame()",
        "",
        "print(f'Nodes: {len(nodes_df)} | Edges: {len(edges_df)}')",
        "if not nodes_df.empty:",
        "    display(nodes_df.head())",
        "if not edges_df.empty:",
        "    display(edges_df.head())",
    ]
    notebook.cells.append(new_code_cell("\n".join(validation_and_tables)))

    _type_specific_notebook_cells(notebook, export_type)
    
    # Add type-specific visualization cells
    if export_type == 'model':
        viz_code = [
            "# Create NetworkX graph",
            "G = nx.DiGraph()",
            "",
            "# Create mapping of node IDs to labels",
            "id_to_label = {}",
            "node_colors = []",
            "node_sizes = []",
            "",
            "# Add nodes and collect node information",
            "for node in model_data['nodes']:",
            "    node_id = node['id']",
            "    label = node.get('label', node_id)",  # Get label directly from node
            "    id_to_label[node_id] = label",
            "    G.add_node(node_id, label=label)",
            "    node_type = node.get('type', 'regular')",
            "    if node_type == 'driver':",
            "        node_colors.append('#e74c3c')",
            "    elif node_type == 'output':",
            "        node_colors.append('#2ecc71')",
            "    else:",
            "        node_colors.append('#3498db')",
            "    node_sizes.append(5000)",  # Increased node size for better visibility
            "",
            "# Add edges",
            "edges_to_draw = []",
            "edge_colors = []",
            "edge_widths = []",
            "for edge in model_data['edges']:",
            "    source = edge['source']",
            "    target = edge['target']",
            "    weight = edge.get('weight', 0)",  # Get weight directly from edge
            "    G.add_edge(source, target, weight=weight)",
            "    edges_to_draw.append((source, target))",
            "    edge_colors.append('#3498db' if weight >= 0 else '#e74c3c')",
            "    edge_widths.append(abs(weight) * 4)",  # Scale width by weight
            "",
            "# Calculate layout with more space between nodes",
            "pos = nx.spring_layout(G, k=3, iterations=50, seed=42)",  # Increased spacing
            "",
            "# Create figure with a specific size",
            "plt.figure(figsize=(16, 12))",
            "",
            "# Draw edges first (so they're behind nodes)",
            "for (u, v), color, width in zip(edges_to_draw, edge_colors, edge_widths):",
            "    nx.draw_networkx_edges(G,",
            "                          pos,",
            "                          edgelist=[(u, v)],",
            "                          edge_color=[color],",
            "                          width=width,",
            "                          arrowsize=30,",  # Increased arrow size
            "                          arrowstyle='->',",
            "                          connectionstyle='arc3,rad=0.3',",  # Increased curve
            "                          alpha=0.8)",  # Increased opacity
            "",
            "# Draw nodes",
            "nx.draw_networkx_nodes(G,",
            "                      pos,",
            "                      node_color=node_colors,",
            "                      node_size=node_sizes,",
            "                      alpha=0.9)",
            "",
            "# Draw labels with increased font size and background",
            "nx.draw_networkx_labels(G,",
            "                       pos,",
            "                       labels=id_to_label,",  # Use the label mapping
            "                       font_size=14,",  # Increased font size
            "                       font_weight='bold',",
            "                       bbox={'facecolor': 'white',",
            "                             'edgecolor': 'none',",
            "                             'alpha': 0.8,",
            "                             'pad': 8})",  # Increased padding
            "",
            "# Draw edge labels with weights",
            "edge_labels = {}",
            "for (u, v, d) in G.edges(data=True):",
            "    weight = d.get('weight', 0)",
            "    # Add + sign for positive weights",
            "    edge_labels[(u, v)] = f'{weight:+.2f}'",
            "",
            "nx.draw_networkx_edge_labels(G,",
            "                            pos,",
            "                            edge_labels=edge_labels,",
            "                            font_size=12,",
            "                            font_weight='bold',",
            "                            bbox={'facecolor': 'white',",
            "                                  'edgecolor': 'none',",
            "                                  'alpha': 0.8})",
            "",
            "plt.title(f\"FCM Model: {model_data.get('name', 'Untitled')}\", pad=20, fontsize=16)",
            "plt.axis('off')",
            "",
            "# Add legend",
            "legend_elements = [",
            "    plt.Line2D([0], [0], color='#3498db', label='Positive Influence', linewidth=4),",
            "    plt.Line2D([0], [0], color='#e74c3c', label='Negative Influence', linewidth=4),",
            "    plt.scatter([0], [0], c='#e74c3c', s=200, label='Driver Node'),",
            "    plt.scatter([0], [0], c='#2ecc71', s=200, label='Output Node'),",
            "    plt.scatter([0], [0], c='#3498db', s=200, label='Regular Node')",
            "]",
            "plt.legend(handles=legend_elements, loc='center left', bbox_to_anchor=(1, 0.5))",
            "",
            "plt.tight_layout()",
            "plt.show()",
            "",
            "# Print statistics using labels",
            "print(f\"Model Name: {model_data.get('name', 'Untitled')}\")",
            "print(f\"Description: {model_data.get('description', 'No description')}\")",
            "print(f\"Number of nodes: {len(model_data.get('nodes', []))}\")",
            "print(f\"Number of edges: {len(model_data.get('edges', []))}\")",
            "",
            "# Add network analysis function that uses labels",
            "def analyze_fcm(G, id_to_label):",
            "    metrics = {}",
            "    ",
            "    # Basic properties",
            "    metrics['node_count'] = G.number_of_nodes()",
            "    metrics['edge_count'] = G.number_of_edges()",
            "    metrics['density'] = nx.density(G)",
            "    metrics['is_connected'] = nx.is_weakly_connected(G)",
            "    ",
            "    # Check for cycles",
            "    try:",
            "        cycles = list(nx.simple_cycles(G))",
            "        metrics['has_cycles'] = len(cycles) > 0",
            "        metrics['cycle_count'] = len(cycles)",
            "    except:",
            "        metrics['has_cycles'] = 'Unknown'",
            "        metrics['cycle_count'] = 'Unknown'",
            "    ",
            "    # Centrality measures with label mapping",
            "    id_centrality = nx.degree_centrality(G)",
            "    metrics['degree_centrality'] = {id_to_label[node]: value for node, value in id_centrality.items()}",
            "    ",
            "    id_in_centrality = nx.in_degree_centrality(G)",
            "    metrics['in_degree_centrality'] = {id_to_label[node]: value for node, value in id_in_centrality.items()}",
            "    ",
            "    id_out_centrality = nx.out_degree_centrality(G)",
            "    metrics['out_degree_centrality'] = {id_to_label[node]: value for node, value in id_out_centrality.items()}",
            "    ",
            "    try:",
            "        id_betweenness = nx.betweenness_centrality(G)",
            "        metrics['betweenness_centrality'] = {id_to_label[node]: value for node, value in id_betweenness.items()}",
            "    except:",
            "        metrics['betweenness_centrality'] = 'Failed to compute'",
            "    ",
            "    try:",
            "        id_closeness = nx.closeness_centrality(G)",
            "        metrics['closeness_centrality'] = {id_to_label[node]: value for node, value in id_closeness.items()}",
            "    except:",
            "        metrics['closeness_centrality'] = 'Failed to compute'",
            "    ",
            "    return metrics",
            "",
            "# Run network analysis with labels",
            "network_metrics = analyze_fcm(G, id_to_label)",
            "",
            "# Print global metrics",
            "print('\\n=== Global Network Metrics ===')",
            "for k, v in network_metrics.items():",
            "    if not isinstance(v, dict):",
            "        print(f\"{k}: {v}\")",
            "",
            "# Process centrality metrics using labels",
            "centrality_metrics = {}",
            "for metric_name, values in network_metrics.items():",
            "    if isinstance(values, dict):",
            "        for node_label, value in values.items():",
            "            if node_label not in centrality_metrics:",
            "                centrality_metrics[node_label] = {}",
            "            centrality_metrics[node_label][metric_name] = value",
            "",
            "# Create DataFrame with labels",
            "centrality_df = pd.DataFrame.from_dict(centrality_metrics, orient='index')",
            "centrality_df.index.name = 'Node'",
            "centrality_df = centrality_df.reset_index()",
            "",
            "# Display table",
            "display(centrality_df)",
            "",
            "# Visualize top nodes by centrality using labels",
            "fig, axes = plt.subplots(2, 2, figsize=(14, 10))",
            "axes = axes.flatten()",
            "",
            "metrics_to_plot = [col for col in centrality_df.columns if col != 'Node' and not isinstance(centrality_df[col].iloc[0], str)]",
            "",
            "for i, metric in enumerate(metrics_to_plot[:4]):",
            "    top_nodes = centrality_df.sort_values(by=metric, ascending=False).head(5)",
            "    sns.barplot(x='Node', y=metric, data=top_nodes, ax=axes[i])",
            "    axes[i].set_title(f'Top 5 Nodes by {metric}')",
            "    axes[i].set_xticklabels(axes[i].get_xticklabels(), rotation=45, ha='right')",
            "",
            "plt.tight_layout()",
            "plt.show()"
        ]
        
        notebook.cells.append(new_code_cell("\n".join(viz_code)))

        simulation_helper_code = [
            "def run_fcm_iteration(node_values, edges_df):",
            "    next_values = node_values.copy()",
            "    for _, edge in edges_df.iterrows():",
            "        src = edge['source']",
            "        tgt = edge['target']",
            "        w = float(edge.get('weight', 0))",
            "        next_values[tgt] = next_values.get(tgt, 0) + node_values.get(src, 0) * w",
            "    # sigmoid squash",
            "    for node_id in list(next_values.keys()):",
            "        x = next_values[node_id]",
            "        next_values[node_id] = 1.0 / (1.0 + np.exp(-x))",
            "    return next_values",
            "",
            "def simulate_fcm(nodes_df, edges_df, max_iterations=20):",
            "    values = {row['id']: float(row.get('value', 0)) for _, row in nodes_df.iterrows()}",
            "    history = [values.copy()]",
            "    for _ in range(max_iterations):",
            "        values = run_fcm_iteration(values, edges_df)",
            "        history.append(values.copy())",
            "    return pd.DataFrame(history)",
            "",
            "if not nodes_df.empty and not edges_df.empty:",
            "    simulation_df = simulate_fcm(nodes_df, edges_df, max_iterations=20)",
            "    display(simulation_df.tail())",
            "    simulation_df.plot(title='Node value trajectories (quick helper simulation)')",
            "    plt.xlabel('Iteration')",
            "    plt.ylabel('Activation')",
            "    plt.show()",
        ]
        notebook.cells.append(new_code_cell("\n".join(simulation_helper_code)))
    
    # Add export cell
    export_code = [
        "# Export analysis artifacts",
        "with open('export_data.json', 'w') as f:",
        f"    json.dump({export_type}_data, f, indent=2)",
        "",
        "if 'nodes_df' in globals() and not nodes_df.empty:",
        "    nodes_df.to_csv('nodes_table.csv', index=False)",
        "if 'edges_df' in globals() and not edges_df.empty:",
        "    edges_df.to_csv('edges_table.csv', index=False)",
        "if 'simulation_df' in globals():",
        "    simulation_df.to_csv('simulation_timeseries.csv', index=False)",
        "if 'comparison_df' in globals():",
        "    comparison_df.to_csv('comparison_deltas.csv', index=False)",
        "if 'scenario_delta_df' in globals():",
        "    scenario_delta_df.to_csv('scenario_deltas.csv', index=False)",
        "",
        "print('Artifacts written: export_data.json, nodes/edges CSV, plus scenario/comparison CSVs when available')"
    ]
    
    notebook.cells.append(new_code_cell("\n".join(export_code)))
    
    return notebook

def model_to_excel(model):
    """Convert model to Excel format with multiple sheets."""
    try:
        print(f"Processing model for Excel export: {model.get('name', 'Unnamed Model')}")
        print(f"Model has {len(model.get('nodes', []))} nodes and {len(model.get('edges', []))} edges")
        print(f"Model keys: {list(model.keys())}")
    
        # Create Excel writer object
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Model Info Sheet
            model_info = pd.DataFrame([{
                'Name': model.get('name', ''),
                'Description': model.get('description', ''),
                'Created At': model.get('createdAt', ''),
                'Updated At': model.get('updatedAt', ''),
                'Node Count': len(model.get('nodes', [])),
                'Edge Count': len(model.get('edges', []))
            }])
            model_info.to_excel(writer, sheet_name='Model Info', index=False)
            print("Created Model Info sheet")

            # Nodes Sheet
            nodes_data = []
            for node in model.get('nodes', []):
                node_data = {
                    'ID': node.get('id', ''),
                    'Label': node.get('label', ''),
                    'Type': node.get('type', 'regular'),
                    'Description': node.get('description', ''),
                    'Initial Value': node.get('initialValue', 0),
                    'Activation Function': node.get('activationFunction', 'sigmoid')
                }
                nodes_data.append(node_data)
            
            nodes_df = pd.DataFrame(nodes_data)
            nodes_df.to_excel(writer, sheet_name='Nodes', index=False)
            print("Created Nodes sheet")

            # Edges Sheet
            edges_data = []
            for edge in model.get('edges', []):
                edge_data = {
                    'Source': edge.get('source', ''),
                    'Target': edge.get('target', ''),
                    'Weight': edge.get('weight', 0),
                    'Description': edge.get('description', '')
                }
                edges_data.append(edge_data)
            
            edges_df = pd.DataFrame(edges_data)
            edges_df.to_excel(writer, sheet_name='Edges', index=False)
            print("Created Edges sheet")

        output.seek(0)  # Important: reset the pointer to the beginning of the buffer
        return output.getvalue()
    except Exception as e:
        print(f"Error converting model to Excel: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise

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