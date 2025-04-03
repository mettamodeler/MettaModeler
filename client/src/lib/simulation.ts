import { FCMEdge, FCMModel, FCMNode, SimulationParams, SimulationResult } from "./types";

// Activation function (sigmoid)
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// Run a simulation on an FCM model
export function runSimulation(
  model: FCMModel,
  params: SimulationParams = {}
): SimulationResult {
  const {
    iterations = 20,
    threshold = 0.001,
    initialValues = {},
  } = params;

  // Initialize node values
  const nodeValues: Record<string, number[]> = {};
  model.nodes.forEach((node) => {
    // Use initial value from params if available, otherwise use node's value
    nodeValues[node.id] = [initialValues[node.id] ?? node.value];
  });

  let isConverged = false;
  let iterationCount = 0;

  // Run the simulation until convergence or max iterations
  while (!isConverged && iterationCount < iterations) {
    const newValues: Record<string, number> = {};
    
    // For each node, calculate its new value
    model.nodes.forEach((node) => {
      // Driver nodes keep their initial value throughout the simulation
      if (node.type === "driver") {
        newValues[node.id] = nodeValues[node.id][0];
      } else {
        // Calculate new value based on connected nodes
        let sum = 0;
        model.edges.forEach((edge) => {
          if (edge.target === node.id) {
            const sourceNodeValue = nodeValues[edge.source][iterationCount];
            sum += sourceNodeValue * edge.weight;
          }
        });
        
        // Apply activation function
        newValues[node.id] = sigmoid(sum);
      }
    });

    // Store new values
    model.nodes.forEach((node) => {
      nodeValues[node.id].push(newValues[node.id]);
    });

    // Check for convergence
    isConverged = true;
    model.nodes.forEach((node) => {
      if (node.type !== "driver") {
        const current = nodeValues[node.id][iterationCount + 1];
        const prev = nodeValues[node.id][iterationCount];
        if (Math.abs(current - prev) > threshold) {
          isConverged = false;
        }
      }
    });

    iterationCount++;
  }

  // Extract final values
  const finalValues: Record<string, number> = {};
  model.nodes.forEach((node) => {
    finalValues[node.id] = nodeValues[node.id][nodeValues[node.id].length - 1];
  });

  return {
    finalValues,
    timeSeriesData: nodeValues,
    iterations: iterationCount,
    converged: isConverged,
  };
}

// Calculate change between initial and final values
export function calculateChange(
  initialValue: number,
  finalValue: number
): number {
  return finalValue - initialValue;
}
