import { NodeType as SharedNodeType, FCMNode as SharedFCMNode, FCMEdge as SharedFCMEdge, FCMModel as SharedFCMModel, Project as SharedProject, Scenario as SharedScenario, SimulationResult as SharedSimulationResult } from '@shared/schema';

export type NodeType = SharedNodeType;
export type FCMNode = SharedFCMNode;
export type FCMEdge = SharedFCMEdge;
export type FCMModel = SharedFCMModel;
export type Project = SharedProject;
export type Scenario = SharedScenario;

// Extended SimulationResult with additional fields for frontend compatibility
export interface ExtendedSimulationResult extends SharedSimulationResult {
  // Support multiple field name formats for compatibility
  finalState?: Record<string, number>;         // Python API format
  timeSeries?: Record<string, number[]>;       // Python API format
  
  // Baseline comparison fields
  baselineFinalState?: Record<string, number>;
  baselineTimeSeries?: Record<string, number[]>;
  baselineIterations?: number;
  baselineConverged?: boolean;
  deltaState?: Record<string, number>;
}

// Re-export the type with our extensions
export type SimulationResult = ExtendedSimulationResult;

export interface SimulationParams {
  iterations?: number;
  threshold?: number;
  initialValues?: Record<string, number>;
}
