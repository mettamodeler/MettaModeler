import { NodeType as SharedNodeType, FCMNode as SharedFCMNode, FCMEdge as SharedFCMEdge, FCMModel as SharedFCMModel, Project as SharedProject, Scenario as SharedScenario, SimulationParameters as SharedSimulationParameters, SimulationResult as SharedSimulationResult, SimulationNode as SharedSimulationNode } from '@shared/schema';

export type NodeType = SharedNodeType;
export type FCMNode = SharedFCMNode;
export type FCMEdge = SharedFCMEdge;
export type FCMModel = SharedFCMModel;
export type Project = SharedProject;
export type SimulationParameters = SharedSimulationParameters & {
  compareToBaseline?: boolean;
  initialValues?: Record<string, number>;
  modelInitialValues?: Record<string, number>;
  scenarioInitialValues?: Record<string, number>;
};
export type SimulationResult = SharedSimulationResult;
export type SimulationNode = SharedSimulationNode;

// Single simulation result type
export interface SingleSimulationResult {
  finalState: Record<string, SimulationNode>;
  timeSeries: Record<string, number[]>;
  iterations: number;
  converged: boolean;
  initialValues: Record<string, number>;
}

// Comparison simulation result type
export interface ComparisonSimulationResult {
  baselineFinalState: Record<string, SimulationNode>;
  comparisonFinalState: Record<string, SimulationNode>;
  deltaFinalState: Record<string, number>;
  baselineTimeSeries: Record<string, number[]>;
  comparisonTimeSeries: Record<string, number[]>;
  converged: boolean;
  iterations: number;
}

// Type guard for single simulation result
export function isSingleSimulationResult(result: any): result is SingleSimulationResult {
  return result && 'finalState' in result && 'timeSeries' in result;
}

// Type guard for comparison simulation result
export function isComparisonSimulationResult(result: any): result is ComparisonSimulationResult {
  return result && 'comparisonFinalState' in result && 'baselineFinalState' in result;
}

export interface SimulationResultWithComparison extends SimulationResult {
  baselineTimeSeries?: Record<string, number[]>;
  baselineFinalState?: Record<string, SimulationNode>;
  comparisonTimeSeries?: Record<string, number[]>;
  comparisonFinalState?: Record<string, SimulationNode>;
  deltaFinalState?: Record<string, number>;
  finalState: Record<string, SimulationNode>;
  timeSeries: Record<string, number[]>;
}

export type ExtendedSimulationResult = SimulationResultWithComparison & {
  simulationParams?: Partial<SimulationParameters>;
  timeSeriesData: Record<string, number[]>;
  finalValues: Record<string, number>;
  params: Partial<SimulationParameters>;
};

export interface BaseScenario extends Omit<SharedScenario, 'results'> {
  results: SimulationResult | null;
  description?: string;
}

export interface ExtendedScenario extends BaseScenario {
  runSimulation?: () => Promise<ExtendedSimulationResult>;
}

export interface ScenarioState {
  scenarios: ExtendedScenario[];
  selectedScenarioId?: string;
  baselineScenarioId?: string;
  simulationRequested?: boolean;
}
