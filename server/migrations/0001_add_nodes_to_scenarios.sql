-- Add missing nodes column to scenarios table
ALTER TABLE "scenarios" ADD COLUMN "nodes" jsonb DEFAULT '[]'::jsonb;

