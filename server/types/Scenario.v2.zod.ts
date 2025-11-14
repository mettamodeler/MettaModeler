import { z } from "zod";
import type { SimulationNode } from "@shared/generated";

const SimulationNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number()
});

export const ScenarioSchema = z.object({
  id: z.number().optional(),
  modelId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  nodes: z.array(SimulationNodeSchema),
  initialValues: z.record(z.string(), z.number()),
  clampedNodes: z.array(z.string()).default([]),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).nullable()
});

export const ScenarioStorageSchema = z.object({
  id: z.number(),
  modelId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  nodes: z.array(SimulationNodeSchema),
  initialValues: z.record(z.string(), z.number()),
  clampedNodes: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date().nullable()
});

export const CreateScenarioSchema = ScenarioSchema.omit({ id: true, createdAt: true, updatedAt: true });

export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioStorage = z.infer<typeof ScenarioStorageSchema>; 