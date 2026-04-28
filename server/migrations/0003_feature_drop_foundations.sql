ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "is_public" text DEFAULT 'false';
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "public_slug" text;
ALTER TABLE "models" ADD CONSTRAINT "models_public_slug_unique" UNIQUE ("public_slug");

ALTER TABLE "scenarios" ADD COLUMN IF NOT EXISTS "include_in_public" text DEFAULT 'false';

CREATE TABLE IF NOT EXISTS "project_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id"),
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "role" text DEFAULT 'editor' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_node_mappings" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id"),
  "canonical_node_key" text NOT NULL,
  "canonical_node_label" text NOT NULL,
  "source_model_id" integer NOT NULL REFERENCES "models"("id"),
  "source_node_id" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
