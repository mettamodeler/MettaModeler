import { pgTable, text, serial, integer, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  role: text("role").default("user"),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Models table
export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  nodes: jsonb("nodes").$type<FCMNode[]>().default([]),
  edges: jsonb("edges").$type<FCMEdge[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Simulation parameters type
export interface SimulationParameters {
  activation: 'sigmoid' | 'tanh' | 'relu' | 'linear';
  threshold: number;
  maxIterations: number;
}

// Scenarios table
export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  modelId: integer("model_id").references(() => models.id),
  initialValues: jsonb("initial_values").$type<Record<string, number>>().default({}),
  results: jsonb("results").$type<SimulationResult>(),
  simulationParams: jsonb("simulation_params").$type<SimulationParameters>().default({
    activation: 'sigmoid',
    threshold: 0.001,
    maxIterations: 20
  }),
  clampedNodes: jsonb("clamped_nodes").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types for Fuzzy Cognitive Maps
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
  sourceHandle?: string;
  targetHandle?: string;
}

export interface SimulationNode {
  id: string;
  label: string;
  value: number;
}

export interface SimulationResult {
  finalState: Record<string, SimulationNode>;
  timeSeries: Record<string, number[]>;
  iterations: number;
  converged: boolean;
  initialValues: Record<string, number>;
  baselineFinalState?: Record<string, SimulationNode>;
  baselineTimeSeries?: Record<string, number[]>;
  baselineIterations?: number;
  baselineConverged?: boolean;
  deltaState?: Record<string, number>;
}

export interface FCMModel {
  id: number;
  name: string;
  description: string | null;
  nodes: FCMNode[];
  edges: FCMEdge[];
  projectId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  role: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  userId: true,
});

export const insertModelSchema = createInsertSchema(models).pick({
  name: true,
  description: true,
  projectId: true,
  nodes: true,
  edges: true,
});

export const insertScenarioSchema = createInsertSchema(scenarios).pick({
  name: true,
  modelId: true,
  initialValues: true,
  results: true,
  simulationParams: true,
  clampedNodes: true
});

// Select types
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertModel = z.infer<typeof insertModelSchema>;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
