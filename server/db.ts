import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
}

// Create the connection with SSL required for Railway/Render
// In tests, DATABASE_URL can be empty; a placeholder is used and should never be queried.
const connectionString = process.env.DATABASE_URL || "postgres://test:test@localhost:5432/test";
// Railway and other cloud providers require SSL
const client = postgres(connectionString, { 
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('render') 
    ? { rejectUnauthorized: false } 
    : undefined
});

// Create the database instance
export const db = drizzle(client, { schema });
