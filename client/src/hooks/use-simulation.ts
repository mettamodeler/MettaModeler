import { useState, useCallback } from 'react';
import { FCMModel, SimulationParameters, ExtendedSimulationResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { runSimulation as runSimulationApi } from '@/lib/simulation';
import { apiRequest } from '@/lib/queryClient';

interface SimulationState extends SimulationParameters {
  initialValues: Record<string, number>;
}

export function useSimulation(model: FCMModel) {
  const { toast } = useToast();
  const [simulationParams, setSimulationParams] = useState<SimulationState & { clampedNodes?: string[] }>({
    activation: 'sigmoid',
    threshold: 0.001,
    maxIterations: 20,
    initialValues: {},
    clampedNodes: []
  });
  const [simulationResult, setSimulationResult] = useState<ExtendedSimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Update simulation parameters
  const updateParams = useCallback((params: Partial<SimulationState & { clampedNodes?: string[] }>) => {
    setSimulationParams(prev => ({ ...prev, ...params }));
  }, []);

  // Set initial value for a specific node
  const setNodeInitialValue = useCallback((nodeId: string, value: number) => {
    setSimulationParams(prev => ({
      ...prev,
      initialValues: { ...prev.initialValues, [nodeId]: value }
    }));
  }, []);

  // Reset initial values to model defaults
  const resetInitialValues = useCallback(() => {
    const defaultValues: Record<string, number> = {};
    model.nodes.forEach(node => {
      defaultValues[node.id] = node.value;
    });
    setSimulationParams(prev => ({
      ...prev,
      initialValues: defaultValues
    }));
  }, [model.nodes]);

  // Run simulation
  const runSimulation = useCallback(async (options?: { clampedNodes?: string[] }): Promise<ExtendedSimulationResult | null> => {
    if (isRunning) return null;
    setIsRunning(true);

    try {
      const result = await runSimulationApi(
        model,
        simulationParams.initialValues,
        {
          activation: simulationParams.activation,
          threshold: simulationParams.threshold,
          maxIterations: simulationParams.maxIterations,
          clampedNodes: options?.clampedNodes || simulationParams.clampedNodes
        }
      );

      setSimulationResult(result);
      return result;
    } catch (error) {
      console.error('Simulation failed:', error);
      toast({
        variant: "destructive",
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : 'An error occurred while running the simulation',
      });
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [model, simulationParams, isRunning, toast]);

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
        clampedNodes: simulationParams.clampedNodes || [],
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
  }, [model.id, simulationParams.initialValues, simulationParams.clampedNodes, simulationResult, toast]);

  return {
    simulationParams,
    simulationResult,
    isRunning,
    updateParams,
    setNodeInitialValue,
    resetInitialValues,
    runSimulation,
    saveScenario,
  };
}
