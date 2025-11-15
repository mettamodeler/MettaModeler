import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the connection with SSL required for Railway/Render
const connectionString = process.env.DATABASE_URL;
// Railway and other cloud providers require SSL
const client = postgres(connectionString, { 
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('render') 
    ? { rejectUnauthorized: false } 
    : undefined
});

// Create the database instance
export const db = drizzle(client, { schema });
