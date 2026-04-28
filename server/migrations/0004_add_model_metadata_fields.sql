ALTER TABLE "models"
  ADD COLUMN IF NOT EXISTS "creator_label" text,
  ADD COLUMN IF NOT EXISTS "problem_statement" text,
  ADD COLUMN IF NOT EXISTS "collection_type" text;
