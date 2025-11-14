/**
 * Generated Type Exports
 * 
 * This file re-exports generated types from JSON Schema files.
 * These are the single source of truth for type definitions.
 * 
 * DO NOT MODIFY THESE TYPES DIRECTLY.
 * Instead, modify the JSON Schema files in /schemas and run:
 *   npm run codegen:all
 */

// FCM Graph Types
export type { FCMNode } from '../server/types/generated/FCMNode.v1';
export type { FCMEdge } from '../server/types/generated/FCMEdge.v1';

// Simulation Types
export type { SimulationNode } from '../server/types/generated/SimulationNode.v1';
export type { SimulationParameters } from '../server/types/generated/SimulationParameters.v1';
export type { SimulationResult } from '../server/types/generated/SimulationResult.v1';

// Re-export NodeType enum
export type NodeType = "driver" | "regular" | "outcome";

// Entity Types (will be migrated in Phase 3C)
export type { User } from '../server/types/generated/User.v1';
export type { Project } from '../server/types/generated/Project.v1';
export type { Model } from '../server/types/generated/Model.v1';
export type { Scenario } from '../server/types/generated/Scenario.v1';

