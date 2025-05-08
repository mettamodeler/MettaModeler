import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { FCMModel, SimulationResultWithComparison } from '@/lib/types';
import { toStringId } from '@/lib/utils';

interface BaselineState {
  baselineResult: SimulationResultWithComparison | null;
  modelId: string | null;
  setBaselineResult: (result: SimulationResultWithComparison, modelId: string) => void;
  clearBaseline: () => void;
  isBaselineValid: (model: FCMModel) => boolean;
  calculateDelta: (scenarioResult: SimulationResultWithComparison) => Record<string, number>;
}

const BaselineContext = createContext<BaselineState | undefined>(undefined);

export function BaselineProvider({ children }: { children: React.ReactNode }) {
  const [baselineResult, setBaselineResultState] = useState<SimulationResultWithComparison | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);

  const setBaselineResult = useCallback((result: SimulationResultWithComparison, modelId: string) => {
    setBaselineResultState(result);
    setModelId(modelId);
  }, []);

  const clearBaseline = useCallback(() => {
    setBaselineResultState(null);
    setModelId(null);
  }, []);

  const calculateDelta = useCallback((scenarioResult: SimulationResultWithComparison) => {
    if (!baselineResult) return {};
    
    // Use the appropriate fields based on whether this is a comparison result
    const finalState = scenarioResult.comparisonFinalState || scenarioResult.finalState;
    const baseState = baselineResult.baselineFinalState || baselineResult.finalState;
    
    return Object.entries(finalState).reduce((acc, [nodeId, node]) => {
      const baselineValue = baseState[nodeId]?.value || 0;
      const scenarioValue = node.value;
      acc[nodeId] = scenarioValue - baselineValue;
      return acc;
    }, {} as Record<string, number>);
  }, [baselineResult]);

  // Check if current baseline is valid for the given model
  const isBaselineValid = useCallback((model: FCMModel): boolean => {
    if (!baselineResult || !modelId) return false;
    
    // Check if model ID matches
    if (toStringId(model.id) !== modelId) return false;
    
    // Check if model structure matches (same nodes and edges)
    const baselineNodes = Object.keys(baselineResult.finalState).sort();
    const modelNodes = model.nodes.map(n => toStringId(n.id)).sort();
    
    if (baselineNodes.length !== modelNodes.length) return false;
    if (!baselineNodes.every((node, i) => node === modelNodes[i])) return false;
    
    return true;
  }, [baselineResult, modelId]);

  return (
    <BaselineContext.Provider 
      value={{ 
        baselineResult, 
        modelId,
        setBaselineResult, 
        clearBaseline,
        isBaselineValid,
        calculateDelta
      }}
    >
      {children}
    </BaselineContext.Provider>
  );
}

export function useBaseline() {
  const context = useContext(BaselineContext);
  if (context === undefined) {
    throw new Error('useBaseline must be used within a BaselineProvider');
  }
  return context;
} 