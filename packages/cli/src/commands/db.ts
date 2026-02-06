import { Command } from "commander";
import { execSync } from "node:child_process";
import chalk from "chalk";

/**
 * `vibe db <action>` — Database operations (migrate, seed, reset, studio).
 */
export function dbCommand(): Command {
  const db = new Command("db").description("Database operations");

  db.command("migrate")
    .description("Run database migrations")
    .action(() => {
      console.log(chalk.cyan("\n  Running migrations...\n"));
      try {
        execSync("npx drizzle-kit push", {
          cwd: process.cwd(),
          stdio: "inherit",
        });
      } catch {
        console.error(chalk.red("\n  Migration failed.\n"));
        process.exit(1);
      }
    });

  db.command("seed")
    .description("Run database seeds")
    .action(() => {
      console.log(chalk.cyan("\n  Running seeds...\n"));
      try {
        execSync("npx tsx src/database/seeds/index.ts", {
          cwd: process.cwd(),
          stdio: "inherit",
        });
      } catch {
        console.error(chalk.red("\n  Seed failed.\n"));
        process.exit(1);
      }
    });

  db.command("reset")
    .description("Reset database (drop + migrate + seed)")
    .action(() => {
      console.log(chalk.cyan("\n  Resetting database...\n"));
      try {
        execSync("npx drizzle-kit push --force", {
          cwd: process.cwd(),
          stdio: "inherit",
        });
        console.log(chalk.green("\n  Database reset complete.\n"));
      } catch {
        console.error(chalk.red("\n  Reset failed.\n"));
        process.exit(1);
      }
    });

  db.command("studio")
    .description("Open Drizzle Studio (database GUI)")
    .action(() => {
      console.log(chalk.cyan("\n  Opening Drizzle Studio...\n"));
      try {
        execSync("npx drizzle-kit studio", {
          cwd: process.cwd(),
          stdio: "inherit",
        });
      } catch {
        // User interrupted
      }
    });

  return db;
}
