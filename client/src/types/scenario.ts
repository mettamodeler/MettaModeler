import { SimulationResponse } from './simulation';

export interface Scenario {
  id: string;
  name: string;
  modelId: string;
  initialValues: Record<string, number>;
  createdAt: string;
  description?: string;
  clampedNodes?: string[];
  results?: SimulationResponse;
  simulationParams?: {
    activation: 'sigmoid' | 'tanh' | 'relu';
    threshold: number;
    maxIterations: number;
  };
}

export interface ExtendedScenario extends Scenario {
  simulationRequested?: boolean;
  runRealBaseline?: () => Promise<SimulationResponse>;
} 