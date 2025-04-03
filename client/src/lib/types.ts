export type NodeType = "driver" | "regular" | "outcome";

export interface FCMNode {
  id: string;
  type: NodeType;
  label: string;
  value: number;
  positionX: number;
  positionY: number;
  color?: string;
}

export interface FCMEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface FCMModel {
  id: string;
  name: string;
  description: string;
  nodes: FCMNode[];
  edges: FCMEdge[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  modelId: string;
  initialValues: Record<string, number>;
  results?: SimulationResult;
  createdAt: string;
}

export interface SimulationResult {
  finalValues: Record<string, number>;
  timeSeriesData: Record<string, number[]>;
  iterations: number;
  converged: boolean;
}

export interface SimulationParams {
  iterations?: number;
  threshold?: number;
  initialValues?: Record<string, number>;
}
