/**
 * Database Client
 *
 * Creates and manages the Drizzle ORM database connection with explicit
 * connection pool configuration. Uses PostgreSQL via the `postgres` driver.
 *
 * Pool defaults:
 *   - max: 20 connections (override with DB_POOL_MAX)
 *   - idle_timeout: 30s (override with DB_POOL_IDLE_TIMEOUT)
 *   - connect_timeout: 10s (override with DB_POOL_CONNECT_TIMEOUT)
 *
 * Usage in app:
 *   import { createDatabase } from '@vibeonrails/core/database';
 *   export const db = createDatabase();
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDatabase>;

export interface DatabasePoolOptions {
  /** Maximum number of connections in the pool (default: 20) */
  max?: number;
  /** Seconds a connection can be idle before being closed (default: 30) */
  idleTimeout?: number;
  /** Seconds to wait for a connection before throwing (default: 10) */
  connectTimeout?: number;
}

/**
 * Create a new database connection with Drizzle ORM.
 *
 * Connection pool is explicitly configured to prevent connection exhaustion
 * under load. Override defaults via environment variables or options.
 *
 * @param connectionString - PostgreSQL connection URL. Defaults to DATABASE_URL env var.
 * @param poolOptions - Connection pool configuration overrides.
 * @returns Drizzle database instance with schema
 */
export function createDatabase(connectionString?: string, poolOptions?: DatabasePoolOptions) {
  const url = connectionString ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      '[AOR] DATABASE_URL environment variable is required.\n' +
      '  Fix: Add DATABASE_URL to your .env file.\n' +
      '  Example: DATABASE_URL=postgresql://user:pass@localhost:5432/myapp\n' +
      '  Docs: https://vibeonrails.dev/errors/DATABASE_URL_MISSING',
    );
  }

  const max = poolOptions?.max
    ?? (parseInt(process.env.DB_POOL_MAX ?? '', 10) || 20);

  const idleTimeout = poolOptions?.idleTimeout
    ?? (parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? '', 10) || 30);

  const connectTimeout = poolOptions?.connectTimeout
    ?? (parseInt(process.env.DB_POOL_CONNECT_TIMEOUT ?? '', 10) || 10);

  const client = postgres(url, {
    max,
    idle_timeout: idleTimeout,
    connect_timeout: connectTimeout,
  });

  return drizzle(client, { schema });
}
