import { useState, useCallback } from 'react';
import { FCMModel, SimulationParams, SimulationResult } from '@/lib/types';
import { runSimulation } from '@/lib/simulation';
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
      const result = runSimulation(model, simulationParams);
      setSimulationResult(result);
      return result;
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
