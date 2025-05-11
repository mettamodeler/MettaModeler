import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).nullable(),
  userId: z.number().nullable()
});

export const ProjectStorageSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  userId: z.number().nullable()
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectStorage = z.infer<typeof ProjectStorageSchema>; 