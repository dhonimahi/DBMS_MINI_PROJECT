// Import the PostgreSQL connection pool and the type that describes a query row.
import { Pool, type QueryResultRow } from 'pg';

// Give the global object a typed place to remember the development pool.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

// Load the PostgreSQL connection string from the server environment.
const connectionString = process.env.DATABASE_URL;
// Check configuration before any database operation runs.
if (!connectionString) {
  // Stop with a setup hint if the connection string is absent.
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env.local and configure PostgreSQL.');
// End the missing-configuration guard.
}

// Reuse the saved pool or create one that opens connections as needed.
export const pool = globalForPg.pgPool ?? new Pool({ connectionString });

// Save the pool during development so hot reloads can reuse it.
if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

// Expose a typed shortcut for SQL statements that do not need a dedicated transaction connection.
export async function query<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  // Send SQL and its parameter values separately through the pool.
  return pool.query<T>(text, params);
// End the query helper.
}
