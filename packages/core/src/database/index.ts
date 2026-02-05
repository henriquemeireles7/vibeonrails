/**
 * @aor/core/database - Database module barrel export
 */

export { createDatabase, type Database } from './client.js';
export { runMigrations } from './migrate.js';
export * from './schema/index.js';
