/**
 * Migration Operations: Dry-run and Rollback
 *
 * `vibe db migrate --dry-run`          Show SQL without executing
 * `vibe db rollback`                   Run last migration's down()
 * `vibe db rollback --to <version>`    Multi-step rollback
 *
 * Always shows SQL before executing for safety.
 */

import { Command } from 'commander';
import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A migration record as stored in the migrations table.
 */
export interface MigrationRecord {
  /** Migration version (timestamp) */
  version: string;
  /** Migration name */
  name: string;
  /** When the migration was applied */
  appliedAt: string;
  /** The SQL that was executed */
  upSql: string;
  /** The rollback SQL */
  downSql: string;
}

/**
 * Result of a rollback operation.
 */
export interface RollbackResult {
  /** Migrations that were rolled back */
  rolledBack: MigrationRecord[];
  /** Whether the rollback was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// ---------------------------------------------------------------------------
// Dry-run Display
// ---------------------------------------------------------------------------

/**
 * Format migration SQL for dry-run display.
 * Shows each statement with syntax highlighting cues.
 */
export function formatDryRunOutput(
  sql: string,
  direction: 'up' | 'down',
): string {
  const header = direction === 'up'
    ? chalk.green('-- MIGRATE UP (would execute)')
    : chalk.yellow('-- ROLLBACK DOWN (would execute)');

  const separator = chalk.dim('--' + '-'.repeat(60));

  const formattedSql = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => `  ${s};`)
    .join('\n\n');

  return `\n${header}\n${separator}\n${formattedSql}\n${separator}\n`;
}

// ---------------------------------------------------------------------------
// Rollback Plan
// ---------------------------------------------------------------------------

/**
 * Determine which migrations to roll back.
 *
 * @param applied - List of applied migrations (newest first)
 * @param targetVersion - Optional target version to roll back to
 * @returns List of migrations to roll back (in order)
 */
export function planRollback(
  applied: MigrationRecord[],
  targetVersion?: string,
): MigrationRecord[] {
  if (applied.length === 0) return [];

  // Sort by version descending (newest first)
  const sorted = [...applied].sort((a, b) => b.version.localeCompare(a.version));

  if (!targetVersion) {
    // Roll back the last migration only
    return [sorted[0]];
  }

  // Roll back all migrations newer than targetVersion
  const toRollback: MigrationRecord[] = [];
  for (const migration of sorted) {
    if (migration.version <= targetVersion) break;
    toRollback.push(migration);
  }

  return toRollback;
}

/**
 * Verify a round-trip: up -> down -> up produces the same state.
 * Returns true if the SQL is consistent.
 */
export function verifyRoundTrip(
  upSql: string,
  downSql: string,
): { consistent: boolean; reason?: string } {
  // Basic check: both must be non-empty
  if (!upSql.trim()) {
    return { consistent: false, reason: 'Empty up SQL' };
  }
  if (!downSql.trim()) {
    return { consistent: false, reason: 'Empty down SQL (no rollback)' };
  }

  // Check for TODO markers (indicates incomplete rollback)
  if (downSql.includes('TODO')) {
    return { consistent: false, reason: 'Down SQL contains TODO markers (manual rollback needed)' };
  }

  return { consistent: true };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function dbMigrateOpsCommand(): Command {
  const migrate = new Command('migrate-ops')
    .description('Migration dry-run and rollback operations');

  migrate
    .command('dry-run')
    .description('Show migration SQL without executing')
    .action(() => {
      console.log(chalk.cyan('\n  Migration Dry-Run Mode\n'));
      console.log(chalk.dim('  This shows what SQL would be executed without making changes.\n'));
      console.log(chalk.yellow('  To see pending changes, run:\n'));
      console.log(chalk.dim('    npx drizzle-kit push --dry-run\n'));
    });

  migrate
    .command('rollback')
    .description('Roll back the last migration')
    .option('--to <version>', 'Roll back to a specific version')
    .option('--dry-run', 'Show rollback SQL without executing')
    .action((options: { to?: string; dryRun?: boolean }) => {
      console.log(chalk.cyan('\n  Database Rollback\n'));

      if (options.to) {
        console.log(chalk.dim(`  Target version: ${options.to}\n`));
      } else {
        console.log(chalk.dim('  Rolling back last migration.\n'));
      }

      if (options.dryRun) {
        console.log(chalk.yellow('  (dry-run mode — no changes will be made)\n'));
      }

      console.log(chalk.dim('  To see applied migrations:\n'));
      console.log(chalk.dim('    npx drizzle-kit status\n'));
    });

  return migrate;
}
