/**
 * Database Migration Runner
 *
 * Runs Drizzle migrations against the database.
 * Usage: npx vibe db:migrate
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from './client.js';

/**
 * Run all pending database migrations.
 *
 * @param migrationsFolder - Path to the migrations directory
 * @param connectionString - Optional database URL override
 */
export async function runMigrations(
  migrationsFolder: string,
  connectionString?: string,
) {
  const db = createDatabase(connectionString);

  console.log('[AOR] Running database migrations...');

  await migrate(db, { migrationsFolder });

  console.log('[AOR] Migrations complete.');
}
