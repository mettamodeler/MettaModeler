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

// Scenarios table
export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  modelId: integer("model_id").references(() => models.id),
  description: text("description"),
  initialValues: jsonb("initial_values").$type<Record<string, number>>().default({}),
  results: jsonb("results").$type<any>(),
  simulationParams: jsonb("simulation_params").$type<any>().default({
    activation: 'sigmoid',
    threshold: 0.001,
    maxIterations: 20
  }),
  clampedNodes: jsonb("clamped_nodes").$type<string[]>().default([]),
  nodes: jsonb("nodes").$type<any[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Types for Fuzzy Cognitive Maps
// NOTE: FCMNode, FCMEdge, SimulationNode, SimulationResult, SimulationParameters
// are now exported from @shared/generated (generated from JSON Schema)
// These manual definitions are kept for backward compatibility during migration
// and will be removed in Phase 3C.

// Re-export generated types for backward compatibility
export type { NodeType } from './generated';
export type { FCMNode, FCMEdge, SimulationNode, SimulationResult, SimulationParameters } from './generated';

// FCMModel uses generated types from @shared/generated
import type { FCMNode, FCMEdge } from './generated';

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
  description: true,
  initialValues: true,
  results: true,
  simulationParams: true,
  clampedNodes: true,
  nodes: true,
  createdAt: true,
  updatedAt: true
});

// Select types
// NOTE: User and Project types now come from generated types (Phase 3C migration)
// Drizzle-inferred types available as users.$inferSelect, projects.$inferSelect for database operations
export type { User, Project } from './generated';
export type Model = typeof models.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;

// Drizzle-inferred types for database operations (internal use)
export type DrizzleUser = typeof users.$inferSelect;
export type DrizzleProject = typeof projects.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertModel = z.infer<typeof insertModelSchema>;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
