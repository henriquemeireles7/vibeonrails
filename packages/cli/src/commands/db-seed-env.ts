/**
 * Per-Environment Database Seeds
 *
 * `vibe db seed` reads from database/seeds/{env}.ts
 * - Dev: 50 users, 200 posts (rich fake data)
 * - Staging: minimal (5 users, 10 posts)
 * - Production: system records only (admin user, default settings)
 *
 * Environment is auto-detected from NODE_ENV.
 *
 * Usage:
 *   vibe db seed                 Seed for current environment
 *   vibe db seed --env staging   Force specific environment
 *   vibe db seed --dry-run       Show seed plan without executing
 */

import { Command } from "commander";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeedEnv = "development" | "staging" | "production" | "test";

/**
 * Seed plan describing what will be seeded.
 */
export interface SeedPlan {
  env: SeedEnv;
  tables: SeedTablePlan[];
  totalRecords: number;
}

/**
 * Plan for a single table's seed data.
 */
export interface SeedTablePlan {
  table: string;
  recordCount: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Environment Detection
// ---------------------------------------------------------------------------

/**
 * Detect the seed environment from NODE_ENV or override.
 */
export function detectSeedEnvironment(override?: string): SeedEnv {
  const env = override ?? process.env.NODE_ENV;

  switch (env) {
    case "production":
      return "production";
    case "staging":
      return "staging";
    case "test":
      return "test";
    default:
      return "development";
  }
}

// ---------------------------------------------------------------------------
// Seed Plans
// ---------------------------------------------------------------------------

/**
 * Get the seed plan for a given environment.
 */
export function getSeedPlan(env: SeedEnv): SeedPlan {
  switch (env) {
    case "development":
      return {
        env,
        tables: [
          {
            table: "users",
            recordCount: 50,
            description: "Rich fake users with profiles",
          },
          {
            table: "posts",
            recordCount: 200,
            description: "Blog posts with varied content",
          },
          {
            table: "comments",
            recordCount: 500,
            description: "User comments on posts",
          },
          {
            table: "settings",
            recordCount: 1,
            description: "Default application settings",
          },
        ],
        totalRecords: 751,
      };

    case "staging":
      return {
        env,
        tables: [
          { table: "users", recordCount: 5, description: "Minimal test users" },
          { table: "posts", recordCount: 10, description: "Sample blog posts" },
          {
            table: "settings",
            recordCount: 1,
            description: "Default application settings",
          },
        ],
        totalRecords: 16,
      };

    case "production":
      return {
        env,
        tables: [
          {
            table: "users",
            recordCount: 1,
            description: "Admin user (system)",
          },
          {
            table: "settings",
            recordCount: 1,
            description: "Default application settings",
          },
        ],
        totalRecords: 2,
      };

    case "test":
      return {
        env,
        tables: [
          {
            table: "users",
            recordCount: 3,
            description: "Test users (admin, user, viewer)",
          },
          { table: "posts", recordCount: 5, description: "Test posts" },
          { table: "settings", recordCount: 1, description: "Test settings" },
        ],
        totalRecords: 9,
      };
  }
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/**
 * Format a seed plan for display.
 */
export function formatSeedPlan(plan: SeedPlan): string {
  const lines = [chalk.bold(`  Seed Plan: ${plan.env}`), ""];

  for (const table of plan.tables) {
    const count = String(table.recordCount).padStart(5);
    lines.push(
      `    ${chalk.cyan(count)}  ${table.table.padEnd(15)} ${chalk.dim(table.description)}`,
    );
  }

  lines.push("");
  lines.push(chalk.dim(`  Total: ${plan.totalRecords} records`));

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function dbSeedEnvCommand(): Command {
  return new Command("seed-env")
    .description("Run environment-specific database seeds")
    .option(
      "--env <environment>",
      "Force specific environment (dev, staging, production, test)",
    )
    .option("--dry-run", "Show seed plan without executing")
    .action((options: { env?: string; dryRun?: boolean }) => {
      const env = detectSeedEnvironment(options.env);
      const plan = getSeedPlan(env);

      console.log(`\n${formatSeedPlan(plan)}\n`);

      if (options.dryRun) {
        console.log(chalk.yellow("  (dry-run — no records will be created)\n"));
        return;
      }

      console.log(
        chalk.dim(`  To seed, ensure database/seeds/${env}.ts exists and run:`),
      );
      console.log(chalk.dim(`    npx tsx database/seeds/${env}.ts\n`));
    });
}
