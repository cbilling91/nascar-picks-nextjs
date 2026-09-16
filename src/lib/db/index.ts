import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// =============================================================================
// Database connection pool (server-side only)
// =============================================================================
// Uses the DATABASE_URL environment variable for CockroachDB connection.
// Format: postgresql://user:password@host:port/database?sslmode=require

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

// =============================================================================
// Helper: get a fresh client for transactions or one-off queries
// =============================================================================
export async function getClient() {
  return pool.connect();
}

// =============================================================================
// Re-export schema for convenience
// =============================================================================
export * from "./schema";