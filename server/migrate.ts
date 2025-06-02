import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    // Read and execute the migration SQL
    const sql = readFileSync(join(__dirname, '../drizzle/0000_initial.sql'), 'utf8');
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main(); 