CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "display_name" TEXT,
  "role" TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "user_id" INTEGER REFERENCES "users"("id"),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "models" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "project_id" INTEGER REFERENCES "projects"("id"),
  "nodes" JSONB DEFAULT '[]',
  "edges" JSONB DEFAULT '[]',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "scenarios" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "model_id" INTEGER REFERENCES "models"("id"),
  "description" TEXT,
  "initial_values" JSONB DEFAULT '{}',
  "results" JSONB,
  "simulation_params" JSONB DEFAULT '{"activation":"sigmoid","threshold":0.001,"maxIterations":20}',
  "clamped_nodes" JSONB DEFAULT '[]',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 