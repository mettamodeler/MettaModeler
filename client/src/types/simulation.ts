export interface SimulationNode {
  id: string;
  label: string;
  value: number;
}

export interface SimulationEdge {
  source: string;
  target: string;
  weight: number;
}

export interface SimulationRequest {
  nodes: SimulationNode[];
  edges: SimulationEdge[];
  activation: 'sigmoid' | 'tanh' | 'relu';
  threshold: number;
  maxIterations: number;
  compareToBaseline: boolean;
  clampedNodes?: string[];
  modelInitialValues?: Record<string, number>;
  scenarioInitialValues?: Record<string, number>;
  initialValues?: Record<string, number>;
}

export interface SimulationResponse {
  finalState: Record<string, SimulationNode>;
  timeSeries: Record<string, number[]>;
  iterations: number;
  converged: boolean;
  initialValues: Record<string, number>;
  baselineFinalState?: Record<string, SimulationNode>;
  baselineTimeSeries?: Record<string, number[]>;
  baselineIterations?: number;
  baselineConverged?: boolean;
  deltaState?: Record<string, number>;
  clampedNodes?: string[];
}

// Helper function to get node value (for backward compatibility during transition)
export function getNodeValue(node: SimulationNode | number): number {
  return typeof node === 'number' ? node : node.value;
}

// Helper function to get node label (if available)
export function getNodeLabel(node: SimulationNode | number, nodeId: string): string {
  return typeof node === 'number' ? nodeId : node.label;
}

export function validateSimulationRequest(data: SimulationRequest): string | null {
  if (!data.nodes || data.nodes.length === 0) {
    return "No nodes provided for simulation";
  }

  for (const node of data.nodes) {
    if (!node.id) return `Node missing ID: ${JSON.stringify(node)}`;
    if (node.value === undefined) return `Node missing value: ${JSON.stringify(node)}`;
  }

  for (const edge of data.edges || []) {
    if (!edge.source) return `Edge missing source: ${JSON.stringify(edge)}`;
    if (!edge.target) return `Edge missing target: ${JSON.stringify(edge)}`;
    if (edge.weight === undefined) return `Edge missing weight: ${JSON.stringify(edge)}`;
  }

  return null;
}