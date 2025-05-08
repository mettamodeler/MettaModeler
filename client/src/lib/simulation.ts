import { FCMModel, SimulationResult, SimulationParameters, FCMNode, FCMEdge } from "./types";

// Calculate change between initial and final values
export function calculateChange(
  initialValue: number,
  finalValue: number
): number {
  return finalValue - initialValue;
}

export interface ExtendedSimulationResult extends SimulationResult {
  iterations: number;
  converged: boolean;
  timeSeriesData: Record<string, number[]>;
  finalValues: Record<string, number>;
  params: Partial<SimulationParameters>;
}

export async function runSimulation(
  model: FCMModel,
  initialValues: Record<string, number> = {},
  params: Partial<SimulationParameters> & { clampedNodes?: string[] } = { 
    activation: 'sigmoid',
    threshold: 0.01,
    maxIterations: 100
  }
): Promise<ExtendedSimulationResult> {
  // Prepare data for Python simulation API
  const nodes = model.nodes.map((node: FCMNode) => ({
    id: node.id,
    value: initialValues[node.id] ?? node.value,
    label: node.label,
    type: node.type
  }));
  
  const edges = model.edges.map((edge: FCMEdge) => ({
    source: edge.source,
    target: edge.target,
    weight: edge.weight
  }));

  // Build payload with type assertion since compareToBaseline is a valid parameter
  const payload = {
    nodes,
    edges,
    activation: params.activation || 'sigmoid',
    threshold: params.threshold || 0.01,
    maxIterations: params.maxIterations || 100,
    compareToBaseline: Boolean(params.compareToBaseline),
    ...(params.compareToBaseline
      ? {
          modelInitialValues: Object.fromEntries(model.nodes.map(n => [n.id, n.value])),
          scenarioInitialValues: initialValues
        }
      : {
          initialValues
        }
    ),
    ...(params.clampedNodes ? { clampedNodes: params.clampedNodes } : {})
  };

  console.log('Simulation API payload:', payload);

  const response = await fetch('/api/simulate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to run simulation');
  }

  const result = await response.json();

  // Log the raw result for debugging
  console.log('Raw simulation result:', result);

  // Format the result to include both timeSeries and timeSeriesData for compatibility
  const formattedResult: ExtendedSimulationResult = {
    ...result,
    timeSeriesData: result.timeSeries || result.timeSeriesData || {},
    timeSeries: result.timeSeries || result.timeSeriesData || {},
    iterations: result.iterations || 0,
    converged: result.converged || false,
    finalValues: result.finalState || {},
    params
  };

  return formattedResult;
} 