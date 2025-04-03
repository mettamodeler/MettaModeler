import { useState, useCallback } from 'react';
import { FCMModel, SimulationParams, SimulationResult, FCMNode, FCMEdge } from '@/lib/types';
import { runSimulation } from '@/lib/simulation'; // Keep this for fallback
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useSimulation(model: FCMModel) {
  const { toast } = useToast();
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    iterations: 20,
    threshold: 0.001,
    initialValues: {},
  });
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Update simulation parameters
  const updateParams = useCallback((params: Partial<SimulationParams>) => {
    setSimulationParams((prev) => ({
      ...prev,
      ...params,
    }));
  }, []);
  
  // Set initial value for a specific node
  const setNodeInitialValue = useCallback((nodeId: string, value: number) => {
    setSimulationParams((prev) => ({
      ...prev,
      initialValues: {
        ...prev.initialValues,
        [nodeId]: value,
      },
    }));
  }, []);
  
  // Reset all initial values to default node values
  const resetInitialValues = useCallback(() => {
    const defaultValues = Object.fromEntries(
      model.nodes.map((node) => [node.id, node.value])
    );
    
    setSimulationParams((prev) => ({
      ...prev,
      initialValues: defaultValues,
    }));
  }, [model.nodes]);
  
  // Run the simulation
  const runSimulationFn = useCallback(async () => {
    setIsRunning(true);
    try {
      // Prepare data for Python simulation API
      const reactFlowNodes = model.nodes.map(node => ({
        id: node.id,
        data: {
          label: node.label,
          value: simulationParams.initialValues?.[node.id] ?? node.value,
          type: node.type
        }
      }));
      
      const reactFlowEdges = model.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        data: {
          weight: edge.weight
        }
      }));

      // Prepare payload
      const payload = {
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
        activation: 'sigmoid',
        threshold: simulationParams.threshold,
        maxIterations: simulationParams.iterations,
        compareToBaseline: true // Always enable baseline comparison for all simulations
      };
      
      // Try to use Python API first
      try {
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error(`Python API error: ${response.statusText}`);
        }
        
        const pythonResult = await response.json();
        
        // Convert Python API response format to our app's format
        const result: SimulationResult = {
          finalValues: pythonResult.finalState,
          timeSeriesData: pythonResult.timeSeries,
          iterations: pythonResult.iterations,
          converged: pythonResult.converged,
          
          // Include baseline comparison data if available
          baselineFinalState: pythonResult.baselineFinalState,
          baselineTimeSeries: pythonResult.baselineTimeSeries,
          baselineIterations: pythonResult.baselineIterations,
          baselineConverged: pythonResult.baselineConverged,
          deltaState: pythonResult.deltaState
        };
        
        setSimulationResult(result);
        return result;
      } catch (pythonError) {
        console.warn('Python simulation failed, falling back to JS implementation:', pythonError);
        
        // Fallback to JavaScript implementation
        const result = runSimulation(model, simulationParams);
        setSimulationResult(result);
        return result;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Simulation Error",
        description: error instanceof Error ? error.message : "Failed to run simulation",
      });
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [model, simulationParams, toast]);
  
  // Save a scenario
  const saveScenario = useCallback(async (name: string) => {
    if (!simulationResult) {
      toast({
        variant: "destructive",
        title: "No Simulation Results",
        description: "Run a simulation before saving a scenario",
      });
      return null;
    }
    
    try {
      const scenario = {
        name,
        modelId: model.id,
        initialValues: simulationParams.initialValues || {},
        results: simulationResult,
        createdAt: new Date().toISOString(),
      };
      
      const response = await apiRequest('POST', '/api/scenarios', scenario);
      
      toast({
        title: "Scenario Saved",
        description: `"${name}" has been saved successfully`,
      });
      
      return response;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Save Scenario",
        description: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }, [model.id, simulationParams.initialValues, simulationResult, toast]);
  
  return {
    simulationParams,
    simulationResult,
    isRunning,
    updateParams,
    setNodeInitialValue,
    resetInitialValues,
    runSimulation: runSimulationFn,
    saveScenario,
  };
}
