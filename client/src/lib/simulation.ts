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
  // Debug: print call stack and params
  console.trace('runSimulation called with params:', params);
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
    schemaVersion: "1.0.0",
    nodes,
    edges,
    activation: params.activation || 'sigmoid',
    threshold: params.threshold || 0.01,
    maxIterations: params.maxIterations || 100,
    compareToBaseline: Boolean(params.compareToBaseline),
    ...(params.compareToBaseline
      ? {
          modelInitialValues: params.modelInitialValues || Object.fromEntries(model.nodes.map(n => [n.id, n.value])),
          scenarioInitialValues: params.scenarioInitialValues || initialValues
        }
      : {}),
    ...(params.clampedNodes ? { clampedNodes: params.clampedNodes } : {})
  };

  console.log('Simulation API payload:', JSON.stringify(payload, null, 2));

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

  const result: SimulationResult = await response.json();
  console.log('Raw simulation result:', JSON.stringify(result, null, 2));
  
  // Transform API response to ExtendedSimulationResult format
  // Extract finalValues from finalState (convert SimulationNode objects to numbers)
  const finalValues: Record<string, number> = {};
  if (result.finalState) {
    Object.entries(result.finalState).forEach(([nodeId, node]) => {
      // Handle both SimulationNode objects and plain numbers
      if (typeof node === 'object' && node !== null && 'value' in node) {
        finalValues[nodeId] = (node as any).value;
      } else if (typeof node === 'number') {
        finalValues[nodeId] = node;
      }
    });
  }
  
  // Create ExtendedSimulationResult with all required properties
  const extendedResult: ExtendedSimulationResult = {
    ...result,
    timeSeriesData: result.timeSeries || {},
    finalValues: finalValues,
    params: {
      activation: params.activation || 'sigmoid',
      threshold: params.threshold || 0.01,
      maxIterations: params.maxIterations || 100,
      ...(params.clampedNodes ? { clampedNodes: params.clampedNodes } : {})
    }
  };
  
  return extendedResult;
} 