import { Command } from "commander";
import { execSync } from "node:child_process";
import chalk from "chalk";

/**
 * `vibe dev` — Start the development server.
 */
export function devCommand(): Command {
  return new Command("dev")
    .description("Start the development server")
    .option("-p, --port <port>", "Port number", "3000")
    .action((options: { port: string }) => {
      console.log(
        chalk.cyan(`\n  Starting dev server on port ${options.port}...\n`),
      );

      try {
        execSync(`PORT=${options.port} npx tsx watch src/main.ts`, {
          cwd: process.cwd(),
          stdio: "inherit",
        });
      } catch {
        // User interrupted with Ctrl+C — that's fine
      }
    });
}
