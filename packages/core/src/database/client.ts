/**
 * Database Client
 *
 * Creates and manages the Drizzle ORM database connection.
 * Uses PostgreSQL via the `postgres` driver.
 *
 * Usage in app:
 *   import { createDatabase } from '@vibeonrails/core/database';
 *   export const db = createDatabase();
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDatabase>;

/**
 * Create a new database connection with Drizzle ORM.
 *
 * @param connectionString - PostgreSQL connection URL. Defaults to DATABASE_URL env var.
 * @returns Drizzle database instance with schema
 */
export function createDatabase(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      '[AOR] DATABASE_URL environment variable is required.\n' +
      '  Fix: Add DATABASE_URL to your .env file.\n' +
      '  Example: DATABASE_URL=postgresql://user:pass@localhost:5432/myapp\n' +
      '  Docs: https://vibeonrails.dev/errors/DATABASE_URL_MISSING',
    );
  }

  const client = postgres(url);
  return drizzle(client, { schema });
}
