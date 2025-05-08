export interface SimulationResult {
  finalState: { [key: string]: number };
  timeSeries: { [key: string]: number[] };
  iterations: number;
  converged: boolean;
  initialValues: { [key: string]: number };
  baselineFinalState?: { [key: string]: number };
  baselineTimeSeries?: { [key: string]: number[] };
  baselineIterations?: number;
  baselineConverged?: boolean;
  baselineInitialValues?: { [key: string]: number };
  delta?: { [key: string]: number };
}

export type ExportFormat = 'csv' | 'json' | 'xlsx';
export type ExportType = 'simulation' | 'baseline' | 'comparison'; 