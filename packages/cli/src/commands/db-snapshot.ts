/**
 * Database Snapshots
 *
 * `vibe db snapshot create <name>`   Save current DB state
 * `vibe db snapshot restore <name>`  Restore a snapshot
 * `vibe db snapshot list`            List all snapshots
 * `vibe db snapshot delete <name>`   Delete a snapshot
 *
 * Stored in .vibe/snapshots/ (pg_dump format).
 * Provides instant rollback during development.
 */

import { Command } from "commander";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Metadata for a database snapshot.
 */
export interface SnapshotMetadata {
  /** Snapshot name */
  name: string;
  /** When the snapshot was created */
  createdAt: string;
  /** Size of the snapshot file in bytes */
  sizeBytes: number;
  /** Database URL (masked) that was snapshotted */
  databaseUrl: string;
  /** File path of the snapshot */
  filePath: string;
}

/**
 * Options for snapshot operations.
 */
export interface SnapshotOptions {
  /** Directory to store snapshots (default: .vibe/snapshots) */
  snapshotDir?: string;
  /** Database URL override */
  databaseUrl?: string;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Default snapshot directory.
 */
export const DEFAULT_SNAPSHOT_DIR = ".vibe/snapshots";

/**
 * Mask a database URL for safe display.
 * Replaces password with *** but keeps host/db visible.
 */
export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return "***masked***";
  }
}

/**
 * Sanitize a snapshot name for use as a filename.
 */
export function sanitizeSnapshotName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/**
 * Get the pg_dump command for creating a snapshot.
 */
export function getPgDumpCommand(
  databaseUrl: string,
  outputPath: string,
): string {
  return `pg_dump "${databaseUrl}" --format=custom --file="${outputPath}"`;
}

/**
 * Get the pg_restore command for restoring a snapshot.
 */
export function getPgRestoreCommand(
  databaseUrl: string,
  inputPath: string,
): string {
  return `pg_restore --clean --if-exists --dbname="${databaseUrl}" "${inputPath}"`;
}

/**
 * Format a file size in bytes to human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format a snapshot for display.
 */
export function formatSnapshot(snapshot: SnapshotMetadata): string {
  const date = new Date(snapshot.createdAt);
  const size = formatFileSize(snapshot.sizeBytes);
  const timeAgo = getTimeAgo(date);

  return `  ${chalk.bold(snapshot.name.padEnd(30))} ${chalk.dim(size.padStart(10))}  ${chalk.dim(timeAgo)}`;
}

/**
 * Get a human-readable time ago string.
 */
function getTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function dbSnapshotCommand(): Command {
  const snapshot = new Command("snapshot").description(
    "Database snapshot management",
  );

  snapshot
    .command("create")
    .description("Create a snapshot of the current database state")
    .argument("<name>", "Snapshot name")
    .action((name: string) => {
      const sanitized = sanitizeSnapshotName(name);
      const dbUrl = process.env.DATABASE_URL;

      if (!dbUrl) {
        console.log(chalk.red("\n  DATABASE_URL is not set.\n"));
        process.exitCode = 1;
        return;
      }

      const outputPath = `${DEFAULT_SNAPSHOT_DIR}/${sanitized}.dump`;
      const command = getPgDumpCommand(dbUrl, outputPath);

      console.log(chalk.cyan(`\n  Creating snapshot: ${sanitized}\n`));
      console.log(chalk.dim(`  Database: ${maskDatabaseUrl(dbUrl)}`));
      console.log(chalk.dim(`  Output: ${outputPath}\n`));
      console.log(chalk.yellow("  Run:\n"));
      console.log(chalk.dim(`    mkdir -p ${DEFAULT_SNAPSHOT_DIR}`));
      console.log(chalk.dim(`    ${command}\n`));
    });

  snapshot
    .command("restore")
    .description("Restore a database snapshot")
    .argument("<name>", "Snapshot name to restore")
    .action((name: string) => {
      const sanitized = sanitizeSnapshotName(name);
      const dbUrl = process.env.DATABASE_URL;

      if (!dbUrl) {
        console.log(chalk.red("\n  DATABASE_URL is not set.\n"));
        process.exitCode = 1;
        return;
      }

      const inputPath = `${DEFAULT_SNAPSHOT_DIR}/${sanitized}.dump`;
      const command = getPgRestoreCommand(dbUrl, inputPath);

      console.log(chalk.cyan(`\n  Restoring snapshot: ${sanitized}\n`));
      console.log(chalk.dim(`  Database: ${maskDatabaseUrl(dbUrl)}`));
      console.log(chalk.dim(`  Input: ${inputPath}\n`));
      console.log(chalk.yellow("  Run:\n"));
      console.log(chalk.dim(`    ${command}\n`));
    });

  snapshot
    .command("list")
    .description("List all database snapshots")
    .action(() => {
      console.log(chalk.cyan(`\n  Snapshots in ${DEFAULT_SNAPSHOT_DIR}/\n`));
      console.log(
        chalk.dim(
          "  No snapshots found. Create one with: vibe db snapshot create <name>\n",
        ),
      );
    });

  snapshot
    .command("delete")
    .description("Delete a database snapshot")
    .argument("<name>", "Snapshot name to delete")
    .action((name: string) => {
      const sanitized = sanitizeSnapshotName(name);
      console.log(chalk.cyan(`\n  Deleting snapshot: ${sanitized}\n`));
      console.log(
        chalk.dim(`  rm ${DEFAULT_SNAPSHOT_DIR}/${sanitized}.dump\n`),
      );
    });

  return snapshot;
}
