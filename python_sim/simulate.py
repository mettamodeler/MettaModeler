import numpy as np
import networkx as nx
import json
import traceback
from typing import Dict, List, Literal, Optional, Tuple, Union, Any
import pandas as pd
import copy
import logging
from flask import current_app

logging.basicConfig(level=logging.INFO)

# --- Normalization Helpers ---
def normalize_node(node: Any) -> Dict:
    """Normalize a node dict from frontend to backend format."""
    # TODO: Remove legacy/nested format support if not needed
    if 'data' in node and isinstance(node['data'], dict):
        node_data = node['data']
        return {
            'id': str(node.get('id', '')),
            'value': float(node_data.get('value', 0.0)),
            'label': str(node_data.get('label', '')),
            'type': str(node_data.get('type', 'regular'))
        }
    return {
        'id': str(node.get('id', '')),
        'value': float(node.get('value', 0.0)),
        'label': str(node.get('label', '')),
        'type': str(node.get('type', 'regular'))
    }

def normalize_edge(edge: Any) -> Dict:
    """Normalize an edge dict from frontend to backend format."""
    # TODO: Remove legacy/nested format support if not needed
    weight = (edge.get('data', {}).get('weight', 0.0)
              if isinstance(edge.get('data'), dict)
              else edge.get('weight', 0.0))
    return {
        'source': str(edge.get('source', '')),
        'target': str(edge.get('target', '')),
        'weight': float(weight)
    }

def normalize_input_data(data: Any) -> Any:
    """Recursively normalize input data from frontend to ensure proper Python types."""
    if isinstance(data, dict):
        if 'source' in data and 'target' in data:
            return normalize_edge(data)
        elif 'id' in data:
            return normalize_node(data)
        return {k: normalize_input_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [normalize_input_data(item) for item in data]
    elif data == "true" or data is True:
        return True
    elif data == "false" or data is False:
        return False
    elif data == "null" or data is None:
        return None
    elif isinstance(data, str):
        if data.lower() in ["sigmoid", "tanh", "relu"]:
            return data.lower()
        try:
            return float(data) if '.' in data else int(data)
        except (ValueError, TypeError):
            return data
    return data

# --- Activation Functions ---
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
        activation_function: Union[Literal["sigmoid", "tanh", "relu"], str] = "sigmoid",
        threshold: float = 0.001,
        max_iterations: int = 100
    ):
        """Initialize FCM simulator with nodes and edges."""
        logging.info("Initializing FCM Simulator")
        logging.info(f"Activation function: {activation_function}")
        logging.info(f"Threshold: {threshold}")
        logging.info(f"Max iterations: {max_iterations}")
        
        if not nodes:
            raise ValueError("No nodes provided for simulation")
        
        self.nodes = [normalize_node(node) for node in nodes]
        self.edges = [normalize_edge(edge) for edge in edges]
        self.threshold = threshold
        self.max_iterations = max_iterations
        
        for node in self.nodes:
            if not isinstance(node, dict) or 'id' not in node:
                raise ValueError(f"Invalid node structure: {node}")
            node_value = node.get('value')
            if node_value is None:
                raise ValueError(f"Node missing value: {node}")
            try:
                float(node_value)
            except (TypeError, ValueError):
                raise ValueError(f"Invalid node value: {node_value}")
        
        if activation_function == "sigmoid":
            self.activation = sigmoid
        elif activation_function == "tanh":
            self.activation = tanh
        elif activation_function == "relu":
            self.activation = relu
        else:
            raise ValueError(f"Unknown activation function: {activation_function}")
        
        self.graph = nx.DiGraph()
        
        logging.info("Adding nodes to graph:")
        for node in self.nodes:
            node_id, value, label = self._parse_node(node)
            logging.debug(f"Extracted values - id: {node_id}, value: {value}, label: {label}")
            self.graph.add_node(
                node_id,
                value=value,
                label=label
            )
            logging.debug(f"Added node {node_id} to graph")
        
        logging.info("Adding edges to graph:")
        for edge in self.edges:
            source, target, weight = self._parse_edge(edge)
            logging.debug(f"Extracted values - source: {source}, target: {target}, weight: {weight}")
            if source in self.graph and target in self.graph:
                self.graph.add_edge(source, target, weight=weight)
                logging.debug(f"Added edge {source} -> {target} with weight {weight}")
            else:
                logging.warning(f"Skipping edge with invalid source or target: {source} -> {target}")
        
        logging.info("Graph initialization complete")
        logging.info(f"Number of nodes: {self.graph.number_of_nodes()}")
        logging.info(f"Number of edges: {self.graph.number_of_edges()}")
        
        self.initial_state = {
            node_id: float(data['value'])
            for node_id, data in self.graph.nodes(data=True)
        }
        self.node_order = list(self.graph.nodes)

    def _parse_node(self, node: Dict) -> Tuple[str, float, str]:
        """Extract id, value, label from a node dict."""
        node_id = str(node.get('id', ''))
        value = float(node.get('value', 0.0))
        label = str(node.get('label', ''))
        return node_id, value, label

    def _parse_edge(self, edge: Dict) -> Tuple[str, str, float]:
        """Extract source, target, weight from an edge dict."""
        source = str(edge.get('source', ''))
        target = str(edge.get('target', ''))
        weight = float(edge.get('weight', 0.0))
        return source, target, weight

    def run_simulation(self, clamped_nodes=None, clamped_values=None) -> Dict:
        """Run the FCM simulation, optionally clamping nodes to fixed values."""
        try:
            logging.info("=== Starting Simulation ===")
            logging.debug(f"Initial graph state: {[node for node in self.graph.nodes(data=True)]}")
            time_series: Dict[str, List[float]] = {
                node: [float(self.graph.nodes[node]['value'])]
                for node in self.graph.nodes
            }
            current_state = {node: self.graph.nodes[node]['value'] for node in self.graph.nodes}
            logging.debug(f"Initial state: {current_state}")
            adjacency_matrix = nx.adjacency_matrix(self.graph).todense()
            logging.debug(f"Adjacency matrix shape: {adjacency_matrix.shape}")
            converged = False
            iterations = 0
            clamped_nodes = clamped_nodes or []
            clamped_values = clamped_values or {}
            while not converged and iterations < self.max_iterations:
                iterations += 1
                logging.debug(f"Iteration {iterations}")
                new_state = {}
                for node in self.graph.nodes:
                    current_values = np.array([self.graph.nodes[n]['value'] for n in self.node_order])
                    node_index = self.node_order.index(node)
                    incoming_weights = np.array(adjacency_matrix)[:, node_index]
                    if node in clamped_nodes:
                        new_value = clamped_values.get(node, self.graph.nodes[node]['value'])
                        logging.debug(f"Node {node}: Clamped at {new_value}")
                    else:
                        new_value = float(self.activation(np.dot(current_values, incoming_weights)))
                        logging.debug(f"Node {node}: {self.graph.nodes[node]['value']} -> {new_value}")
                    new_state[node] = new_value
                max_change = max(abs(new_state[node] - self.graph.nodes[node]['value']) 
                               for node in self.graph.nodes)
                logging.debug(f"Max change: {max_change}")
                if max_change < self.threshold:
                    converged = True
                    logging.info("Simulation converged")
                for node, value in new_state.items():
                    self.graph.nodes[node]['value'] = value
                    time_series[node].append(value)
            logging.info(f"Simulation completed after {iterations} iterations")
            logging.info(f"Converged: {converged}")
            final_state = {
                node: {
                    'id': node,
                    'label': self.graph.nodes[node]['label'],
                    'value': float(self.graph.nodes[node]['value'])
                }
                for node in self.graph.nodes
            }
            logging.debug(f"Final state: {json.dumps(final_state, indent=2)}")
            return {
                'finalState': final_state,
                'timeSeries': time_series,
                'iterations': iterations,
                'converged': converged,
                'initialValues': {node: float(val) for node, val in current_state.items()},
                'clampedNodes': clamped_nodes or []
            }
        except Exception as e:
            logging.error(f"Error in simulation: {str(e)}")
            logging.error(f"Error type: {type(e).__name__}")
            logging.error(f"Traceback: {traceback.format_exc()}")
            raise

def run_simulation(
    nodes: List[Dict],
    edges: List[Dict],
    activation_function: str = "sigmoid",
    threshold: float = 0.001,
    max_iterations: int = 100,
    generate_notebook: bool = False,
    clamped_nodes: Optional[List[str]] = None,
    clamped_values: Optional[Dict[str, float]] = None
) -> Dict:
    """Run a single FCM simulation with optional node clamping.
    
    Args:
        nodes: List of node dictionaries containing id, value, and label
        edges: List of edge dictionaries containing source, target, and weight
        activation_function: Activation function to use ('sigmoid', 'tanh', 'relu')
        threshold: Convergence threshold for simulation
        max_iterations: Maximum number of iterations before stopping
        generate_notebook: Whether to generate a Jupyter notebook (deprecated, use export.py instead)
        clamped_nodes: List of node IDs to clamp during simulation
        clamped_values: Dictionary mapping node IDs to their clamped values
        
    Returns:
        Dict containing simulation results:
        - finalState: Final state of all nodes
        - timeSeries: Time series data for all nodes
        - iterations: Number of iterations performed
        - converged: Whether simulation converged
        - initialValues: Initial values of all nodes
        - clampedNodes: List of clamped nodes
        
    Raises:
        ValueError: If simulation fails or input data is invalid
    """
    try:
        logging.info("Running simulation...")
        
        # Validate input data
        if not nodes:
            raise ValueError("No nodes provided for simulation")
        if not all(isinstance(node, dict) and 'id' in node for node in nodes):
            raise ValueError("Invalid node structure: all nodes must be dictionaries with 'id'")
        if not all(isinstance(edge, dict) and 'source' in edge and 'target' in edge for edge in edges):
            raise ValueError("Invalid edge structure: all edges must be dictionaries with 'source' and 'target'")
        
        # Create simulator instance
        simulator = FCMSimulator(
            nodes=nodes,
            edges=edges,
            activation_function=activation_function,
            threshold=threshold,
            max_iterations=max_iterations
        )
        
        # Run simulation with clamping
        results = simulator.run_simulation(
            clamped_nodes=clamped_nodes,
            clamped_values=clamped_values
        )
        
        logging.info("Simulation completed successfully")
        logging.debug(f"Time series data structure: {len(results.get('timeSeries', {}).get(list(results['timeSeries'].keys())[0], []))} iterations")
        
        # Return results in the correct format
        return {
            'finalState': results.get('finalState', {}),
            'timeSeries': results.get('timeSeries', {}),
            'iterations': results.get('iterations', 0),
            'converged': results.get('converged', False),
            'initialValues': results.get('initialValues', {}),
            'clampedNodes': clamped_nodes or []
        }
        
    except Exception as e:
        logging.error(f"Error in simulation: {str(e)}")
        logging.error(f"Error type: {type(e).__name__}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise ValueError(f"Simulation failed: {str(e)}")

def apply_initial_values(
    nodes: List[Dict],
    initial_values: Optional[Dict[str, float]]
) -> List[Dict]:
    """Apply initial values to nodes, ensuring all values are properly set.
    
    Args:
        nodes: List of node dictionaries containing id and value
        initial_values: Dictionary mapping node IDs to initial values
        
    Returns:
        List of updated node dictionaries with initial values applied
        
    Raises:
        ValueError: If a node ID in initial_values is not found in nodes
        TypeError: If node values cannot be converted to float
    """
    try:
        logging.info(f"Applying initial values: {initial_values}")
        
        # Validate input
        if not nodes:
            raise ValueError("No nodes provided")
        if not all(isinstance(node, dict) and 'id' in node for node in nodes):
            raise ValueError("Invalid node structure: all nodes must be dictionaries with 'id'")
        
        # Create a set of valid node IDs for quick lookup
        valid_node_ids = {str(node['id']) for node in nodes}
        
        # Validate initial values
        if initial_values:
            invalid_ids = set(initial_values.keys()) - valid_node_ids
            if invalid_ids:
                raise ValueError(f"Initial values provided for non-existent nodes: {invalid_ids}")
        
        # Apply values
        for node in nodes:
            node_id = str(node['id'])
            if initial_values and node_id in initial_values:
                try:
                    node['value'] = float(initial_values[node_id])
                    logging.info(f"Set node {node_id} value to {node['value']} from initial values")
                except (TypeError, ValueError) as e:
                    raise TypeError(f"Invalid value for node {node_id}: {initial_values[node_id]}") from e
            else:
                logging.info(f"Using default value {node.get('value', 0)} for node {node_id}")
        
        return nodes
        
    except Exception as e:
        logging.error(f"Error applying initial values: {str(e)}")
        logging.error(f"Error type: {type(e).__name__}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise

def fuzzy_categorize_direction(
    baseline_series: List[float],
    scenario_series: List[float],
    global_max_change: float,
    epsilon: float = 1e-4
) -> str:
    """Categorize the direction of change between baseline and scenario time series.
    
    Args:
        baseline_series: List of baseline time series values.
        scenario_series: List of scenario time series values.
        global_max_change: Global maximum change for relative comparison.
        epsilon: Small value to avoid division by zero.
    
    Returns:
        String categorizing the direction (e.g., 'No Change', 'High Increase', 'Oscillating (Medium)').
    
    Raises:
        ValueError: If input series are empty or of mismatched length.
    """
    try:
        if not baseline_series or not scenario_series:
            raise ValueError("Input series must not be empty.")
        if len(baseline_series) != len(scenario_series):
            raise ValueError("Baseline and scenario series must be of equal length.")
        
        diff_series = np.array(scenario_series) - np.array(baseline_series)
        final_delta = diff_series[-1]
        max_abs = np.max(np.abs(diff_series))
        rel = max_abs / (global_max_change + epsilon)

        if rel <= 0.1:
            return "No Change"

        # Magnitude label
        if rel > 0.7:
            mag = "High"
        elif rel > 0.3:
            mag = "Medium"
        else:
            mag = "Low"

        # Oscillating: more than one sign flip
        signs = np.sign(diff_series)
        nonzero_signs = signs[signs != 0]
        if len(nonzero_signs) > 1:
            crosses = np.sum(np.diff(nonzero_signs) != 0)
            if crosses > 1:
                return f"Oscillating ({mag})"

        auc = np.trapz(diff_series)
        # Temporary change: returns to near baseline at end (relative threshold)
        if rel > 0.1 and np.abs(final_delta) < max(epsilon, 0.05 * max_abs):
            return f"Temporary {mag} {'Increase' if auc > 0 else 'Decrease'}"

        # Sustained change
        if final_delta > epsilon:
            return f"{mag} Increase"
        elif final_delta < -epsilon:
            return f"{mag} Decrease"

        # Fallback: use AUC (area under the curve)
        if auc > 0:
            return f"{mag} Increase"
        elif auc < 0:
            return f"{mag} Decrease"

        return "No Change"
    except Exception as e:
        logging.error(f"Error in fuzzy_categorize_direction: {str(e)}")
        logging.error(f"Error type: {type(e).__name__}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise

def _calculate_impact_metrics(
    node_id: str,
    baseline_results: Dict,
    scenario_results: Dict,
    global_max_change: float
) -> Dict:
    """Calculate impact metrics for a single node.
    
    Args:
        node_id: ID of the node to analyze.
        baseline_results: Results from baseline simulation (dict with 'finalState' and 'timeSeries').
        scenario_results: Results from scenario simulation (dict with 'finalState' and 'timeSeries').
        global_max_change: Global maximum change for relative comparison.
    
    Returns:
        Dictionary containing impact metrics for the node:
            - id: Node ID
            - label: Node label
            - baseline: Baseline final value
            - scenario: Scenario final value
            - delta: Difference (scenario - baseline)
            - normalizedChangePercent: Normalized percent change
            - auc: Area under the curve of the difference series
            - maxDifference: Maximum absolute difference
            - direction: Fuzzy direction label
    
    Raises:
        ValueError: If node_id is missing from results or series are empty.
    """
    try:
        if node_id not in baseline_results['finalState'] or node_id not in scenario_results['finalState']:
            raise ValueError(f"Node ID {node_id} missing from finalState.")
        if node_id not in baseline_results['timeSeries'] or node_id not in scenario_results['timeSeries']:
            raise ValueError(f"Node ID {node_id} missing from timeSeries.")
        
        baseline_value = baseline_results['finalState'][node_id]['value']
        scenario_value = scenario_results['finalState'][node_id]['value']
        
        # Normalized percent change
        epsilon = 1e-8
        denom = max(abs(scenario_value), abs(baseline_value), epsilon)
        normalized_change = ((scenario_value - baseline_value) / denom) * 100
        
        # Time series analysis
        baseline_series = baseline_results['timeSeries'][node_id]
        scenario_series = scenario_results['timeSeries'][node_id]
        min_len = min(len(baseline_series), len(scenario_series))
        if min_len == 0:
            raise ValueError(f"Empty time series for node {node_id}.")
        baseline_series = baseline_series[:min_len]
        scenario_series = scenario_series[:min_len]
        diff_series = [s - b for s, b in zip(scenario_series, baseline_series)]
        
        # Calculate metrics
        auc = float(np.trapz(diff_series)) if len(diff_series) > 1 else 0.0
        max_diff = max(diff_series, key=abs) if diff_series else 0.0
        direction = fuzzy_categorize_direction(baseline_series, scenario_series, global_max_change)
        
        return {
            'id': node_id,
            'label': baseline_results['finalState'][node_id]['label'],
            'baseline': baseline_value,
            'scenario': scenario_value,
            'delta': scenario_value - baseline_value,
            'normalizedChangePercent': normalized_change,
            'auc': auc,
            'maxDifference': max_diff,
            'direction': direction
        }
    except Exception as e:
        logging.error(f"Error in _calculate_impact_metrics for node {node_id}: {str(e)}")
        logging.error(f"Error type: {type(e).__name__}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise

def run_baseline_scenario_comparison(
    nodes: List[Dict],
    edges: List[Dict],
    activation_function: str = 'sigmoid',
    threshold: float = 0.001,
    max_iterations: int = 100,
    model_initial_values: Optional[Dict[str, float]] = None,
    scenario_initial_values: Optional[Dict[str, float]] = None,
    clamped_nodes: Optional[List[str]] = None
) -> Dict:
    """Run a comparison between baseline and scenario simulations.
    
    Args:
        nodes: List of node dictionaries
        edges: List of edge dictionaries
        activation_function: Activation function to use ('sigmoid', 'tanh', 'relu')
        threshold: Convergence threshold
        max_iterations: Maximum number of iterations
        model_initial_values: Dictionary mapping node IDs to initial values for baseline
        scenario_initial_values: Dictionary mapping node IDs to initial values for scenario
        clamped_nodes: List of node IDs to clamp in scenario
        
    Returns:
        Dict containing comparison results:
        - baselineFinalState: Final state of baseline simulation
        - comparisonFinalState: Final state of scenario simulation
        - baselineTimeSeries: Time series data from baseline simulation
        - comparisonTimeSeries: Time series data from scenario simulation
        - deltaFinalState: Difference between final states
        - impactMetrics: Detailed impact metrics for each node
        - converged: Whether both simulations converged
        - iterations: Maximum iterations taken
        - clampedNodes: List of clamped nodes
        
    Raises:
        ValueError: If simulation fails or input data is invalid
    """
    try:
        logging.info("=== Starting Baseline vs Scenario Comparison ===")
        logging.info(f"Model initial values: {model_initial_values}")
        logging.info(f"Scenario initial values: {scenario_initial_values}")
        logging.info(f"Clamped nodes: {clamped_nodes}")
        
        # Create copies of nodes for baseline and scenario
        baseline_nodes = copy.deepcopy(nodes)
        scenario_nodes = copy.deepcopy(nodes)
        
        # Apply initial values
        if model_initial_values:
            logging.info(f"Applying model initial values: {model_initial_values}")
            for node in baseline_nodes:
                if node['id'] in model_initial_values:
                    node['value'] = model_initial_values[node['id']]
                    logging.info(f"Setting baseline node {node['id']} to {node['value']}")
        
        if scenario_initial_values:
            logging.info(f"Applying scenario initial values: {scenario_initial_values}")
            for node in scenario_nodes:
                if node['id'] in scenario_initial_values:
                    node['value'] = scenario_initial_values[node['id']]
                    logging.info(f"Setting scenario node {node['id']} to {node['value']}")
        
        logging.info(f"Baseline node values: {[(n['id'], n['value']) for n in baseline_nodes]}")
        logging.info(f"Scenario node values: {[(n['id'], n['value']) for n in scenario_nodes]}")
        
        # Prepare clamped values for scenario
        clamped_values = {
            node['id']: node['value'] 
            for node in scenario_nodes 
            if clamped_nodes and node['id'] in clamped_nodes
        }
        
        # Run simulations
        baseline_results = run_simulation(
            nodes=baseline_nodes,
            edges=edges,
            activation_function=activation_function,
            threshold=threshold,
            max_iterations=max_iterations
        )
        
        scenario_results = run_simulation(
            nodes=scenario_nodes,
            edges=edges,
            activation_function=activation_function,
            threshold=threshold,
            max_iterations=max_iterations,
            clamped_nodes=clamped_nodes,
            clamped_values=clamped_values
        )
        
        # Log time series data for debugging
        logging.debug("Time Series Data:")
        logging.debug("Baseline Time Series:")
        for node_id, values in baseline_results['timeSeries'].items():
            logging.debug(f"  {node_id}: {values}")
        
        logging.debug("Scenario Time Series:")
        for node_id, values in scenario_results['timeSeries'].items():
            logging.debug(f"  {node_id}: {values}")
        
        # Calculate global max change for fuzzy direction
        all_diff_series = []
        for node_id in baseline_results['finalState']:
            if clamped_nodes and node_id in clamped_nodes:
                continue  # skip clamped nodes for global max
            baseline_series = baseline_results['timeSeries'][node_id]
            scenario_series = scenario_results['timeSeries'][node_id]
            min_len = min(len(baseline_series), len(scenario_series))
            baseline_series = baseline_series[:min_len]
            scenario_series = scenario_series[:min_len]
            diff_series = [s - b for s, b in zip(scenario_series, baseline_series)]
            all_diff_series.append(np.max(np.abs(diff_series)))
        
        global_max_change = max(all_diff_series) if all_diff_series else 1.0
        
        # Calculate impact metrics for each node
        impact_metrics = {}
        delta_final_state = {}
        
        for node_id in baseline_results['finalState']:
            # Calculate impact metrics
            metrics = _calculate_impact_metrics(
                node_id,
                baseline_results,
                scenario_results,
                global_max_change
            )
            impact_metrics[node_id] = metrics
            
            # Calculate delta final state
            delta_final_state[node_id] = {
                'id': node_id,
                'label': baseline_results['finalState'][node_id]['label'],
                'value': scenario_results['finalState'][node_id]['value'] - baseline_results['finalState'][node_id]['value']
            }
        
        return {
            'baselineFinalState': baseline_results['finalState'],
            'comparisonFinalState': scenario_results['finalState'],
            'baselineTimeSeries': baseline_results['timeSeries'],
            'comparisonTimeSeries': scenario_results['timeSeries'],
            'deltaFinalState': delta_final_state,
            'impactMetrics': impact_metrics,
            'converged': baseline_results['converged'] and scenario_results['converged'],
            'iterations': max(baseline_results['iterations'], scenario_results['iterations']),
            'clampedNodes': clamped_nodes or []
        }
        
    except Exception as e:
        logging.error(f"Error in baseline-scenario comparison: {str(e)}")
        logging.error(f"Error type: {type(e).__name__}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise ValueError(f"Baseline-scenario comparison failed: {str(e)}")