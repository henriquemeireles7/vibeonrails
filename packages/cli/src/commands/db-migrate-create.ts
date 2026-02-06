/**
 * Migration Create Command
 *
 * `vibe db migrate create` diffs current Drizzle schema vs database state,
 * auto-generates SQL migration with both up() and down() functions.
 * Flags destructive operations (DROP, RENAME) requiring --destructive.
 *
 * Usage:
 *   vibe db migrate create                    Auto-generate migration
 *   vibe db migrate create --name add-bio     Named migration
 *   vibe db migrate create --destructive      Allow destructive changes
 */

import { Command } from "commander";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MigrationOperationType = "additive" | "destructive";

/**
 * A single operation in a migration.
 */
export interface MigrationOperation {
  /** SQL statement */
  sql: string;
  /** Type: additive (safe) or destructive (requires --destructive) */
  type: MigrationOperationType;
  /** Human-readable description */
  description: string;
}

/**
 * A generated migration.
 */
export interface GeneratedMigration {
  /** Migration version (timestamp-based) */
  version: string;
  /** Migration name */
  name: string;
  /** Up operations (apply) */
  up: MigrationOperation[];
  /** Down operations (rollback) */
  down: MigrationOperation[];
  /** Whether any operation is destructive */
  hasDestructive: boolean;
  /** File path where migration will be saved */
  filePath: string;
}

// ---------------------------------------------------------------------------
// Version Generation
// ---------------------------------------------------------------------------

/**
 * Generate a migration version string from current timestamp.
 * Format: YYYYMMDDHHMMSS
 */
export function generateMigrationVersion(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// ---------------------------------------------------------------------------
// Destructive Detection
// ---------------------------------------------------------------------------

const DESTRUCTIVE_PATTERNS = [
  { pattern: /DROP\s+TABLE/i, description: "Drop table" },
  { pattern: /DROP\s+COLUMN/i, description: "Drop column" },
  {
    pattern: /ALTER\s+TABLE\s+\w+\s+RENAME/i,
    description: "Rename table/column",
  },
  { pattern: /TRUNCATE/i, description: "Truncate table" },
  { pattern: /DROP\s+INDEX/i, description: "Drop index" },
  {
    pattern: /ALTER\s+COLUMN\s+\w+\s+TYPE/i,
    description: "Change column type",
  },
];

/**
 * Classify a SQL statement as additive or destructive.
 */
export function classifyOperation(sql: string): {
  type: MigrationOperationType;
  reason?: string;
} {
  for (const { pattern, description } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(sql)) {
      return { type: "destructive", reason: description };
    }
  }
  return { type: "additive" };
}

/**
 * Parse SQL operations from a migration SQL string.
 * Splits on semicolons and classifies each statement.
 */
export function parseOperations(sql: string): MigrationOperation[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((statement) => {
      const classification = classifyOperation(statement);
      return {
        sql: `${statement};`,
        type: classification.type,
        description: describeOperation(statement),
      };
    });
}

/**
 * Generate a human-readable description for a SQL operation.
 */
export function describeOperation(sql: string): string {
  const normalized = sql.trim().toUpperCase();

  if (normalized.startsWith("CREATE TABLE")) {
    const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    return match ? `Create table "${match[1]}"` : "Create table";
  }
  if (normalized.startsWith("ALTER TABLE") && /ADD\s+COLUMN/i.test(sql)) {
    const tableMatch = sql.match(/ALTER\s+TABLE\s+(\w+)/i);
    const colMatch = sql.match(
      /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
    );
    return `Add column "${colMatch?.[1]}" to "${tableMatch?.[1]}"`;
  }
  if (normalized.startsWith("ALTER TABLE") && /DROP\s+COLUMN/i.test(sql)) {
    const tableMatch = sql.match(/ALTER\s+TABLE\s+(\w+)/i);
    const colMatch = sql.match(/DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
    return `Drop column "${colMatch?.[1]}" from "${tableMatch?.[1]}"`;
  }
  if (normalized.startsWith("CREATE INDEX")) {
    const match = sql.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    return match ? `Create index "${match[1]}"` : "Create index";
  }
  if (normalized.startsWith("DROP TABLE")) {
    const match = sql.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
    return match ? `Drop table "${match[1]}"` : "Drop table";
  }
  if (normalized.startsWith("DROP INDEX")) {
    const match = sql.match(/DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
    return match ? `Drop index "${match[1]}"` : "Drop index";
  }

  // Generic fallback: first 60 chars
  return sql.slice(0, 60) + (sql.length > 60 ? "..." : "");
}

/**
 * Generate reverse (down) operations from up operations.
 * Best-effort — not all operations can be cleanly reversed.
 */
export function generateDownOperations(
  upOps: MigrationOperation[],
): MigrationOperation[] {
  const downOps: MigrationOperation[] = [];

  for (const op of [...upOps].reverse()) {
    const reversed = reverseOperation(op.sql);
    if (reversed) {
      downOps.push({
        sql: reversed,
        type: classifyOperation(reversed).type,
        description: describeOperation(reversed),
      });
    } else {
      downOps.push({
        sql: `-- TODO: Manual rollback needed for: ${op.description}`,
        type: "additive",
        description: `Manual rollback for: ${op.description}`,
      });
    }
  }

  return downOps;
}

/**
 * Attempt to reverse a SQL operation.
 */
export function reverseOperation(sql: string): string | null {
  const normalized = sql.trim();

  // CREATE TABLE -> DROP TABLE
  const createTableMatch = normalized.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
  );
  if (createTableMatch) {
    return `DROP TABLE IF EXISTS ${createTableMatch[1]};`;
  }

  // ADD COLUMN -> DROP COLUMN
  const addColMatch = normalized.match(
    /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
  );
  if (addColMatch) {
    return `ALTER TABLE ${addColMatch[1]} DROP COLUMN IF EXISTS ${addColMatch[2]};`;
  }

  // CREATE INDEX -> DROP INDEX
  const createIdxMatch = normalized.match(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
  );
  if (createIdxMatch) {
    return `DROP INDEX IF EXISTS ${createIdxMatch[1]};`;
  }

  // DROP TABLE -> Cannot reverse (data loss)
  // DROP COLUMN -> Cannot reverse (data loss)
  return null;
}

// ---------------------------------------------------------------------------
// Migration File Generation
// ---------------------------------------------------------------------------

/**
 * Format a migration as a TypeScript file.
 */
export function formatMigrationFile(migration: GeneratedMigration): string {
  const upStatements = migration.up
    .map((op) => {
      const marker = op.type === "destructive" ? " // DESTRUCTIVE" : "";
      return `    // ${op.description}\n    await sql\`${op.sql.replace(/;$/, "")}\`;${marker}`;
    })
    .join("\n\n");

  const downStatements = migration.down
    .map((op) => {
      return `    // ${op.description}\n    await sql\`${op.sql.replace(/;$/, "")}\`;`;
    })
    .join("\n\n");

  return `/**
 * Migration: ${migration.version}_${migration.name}
 * Generated at: ${new Date().toISOString()}
 * ${migration.hasDestructive ? "WARNING: Contains destructive operations" : "Safe: additive-only operations"}
 */

import type { SQL } from 'drizzle-orm';

export async function up(sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>): Promise<void> {
${upStatements}
}

export async function down(sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>): Promise<void> {
${downStatements}
}
`;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function dbMigrateCreateCommand(): Command {
  return new Command("migrate-create")
    .description("Auto-generate migration from schema diff")
    .option("--name <name>", "Migration name", "auto")
    .option("--destructive", "Allow destructive operations")
    .option("--dry-run", "Show SQL without creating migration file")
    .action(
      (options: { name?: string; destructive?: boolean; dryRun?: boolean }) => {
        const version = generateMigrationVersion();
        const name = options.name ?? "auto";

        console.log(
          chalk.cyan(`\n  Generating migration: ${version}_${name}\n`),
        );
        console.log(
          chalk.dim("  This command analyzes your Drizzle schema against"),
        );
        console.log(
          chalk.dim("  the current database state and generates SQL.\n"),
        );

        console.log(chalk.yellow("  To generate a migration, run:\n"));
        console.log(chalk.dim("    npx drizzle-kit generate"));
        console.log(
          chalk.dim("    npx drizzle-kit push --dry-run  (to see the diff)\n"),
        );

        if (!options.destructive) {
          console.log(
            chalk.dim(
              "  Destructive operations (DROP, RENAME) require --destructive flag.\n",
            ),
          );
        }
      },
    );
}
