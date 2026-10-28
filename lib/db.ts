import { Pool, type QueryResultRow } from 'pg';

const globalForPg = globalThis as unknown as { pgPool?: Pool };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env.local and configure PostgreSQL.');
}

export const pool = globalForPg.pgPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

export async function query<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}
