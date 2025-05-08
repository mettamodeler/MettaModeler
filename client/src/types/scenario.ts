import { SimulationResponse } from './simulation';

export interface Scenario {
  id: string;
  name: string;
  modelId: string;
  initialValues: Record<string, number>;
  createdAt: string;
  description?: string;
}

export interface ExtendedScenario extends Scenario {
  results?: SimulationResponse;
  simulationRequested?: boolean;
  runRealBaseline?: () => Promise<SimulationResponse>;
} 