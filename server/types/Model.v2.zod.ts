import { z } from "zod";
import type { FCMNode, FCMEdge } from "@shared/schema";

const FCMNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["driver", "regular", "outcome"]),
  label: z.string(),
  value: z.number(),
  positionX: z.number(),
  positionY: z.number(),
  color: z.string().optional()
});

const FCMEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  weight: z.number(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional()
});

export const ModelSchema = z.object({
  id: z.number().optional(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  nodes: z.array(FCMNodeSchema),
  edges: z.array(FCMEdgeSchema),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).nullable()
});

export const ModelStorageSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  nodes: z.array(FCMNodeSchema),
  edges: z.array(FCMEdgeSchema),
  createdAt: z.date(),
  updatedAt: z.date().nullable()
});

export const CreateModelSchema = ModelSchema.omit({ id: true, createdAt: true, updatedAt: true });

export type Model = z.infer<typeof ModelSchema>;
export type ModelStorage = z.infer<typeof ModelStorageSchema>; 