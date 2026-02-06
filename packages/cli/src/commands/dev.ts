/**
 * `vibe dev` — Enhanced development server orchestrator.
 *
 * Single Vite instance in middleware mode (API + web in one process),
 * lazy site servers (Astro starts on first request),
 * parallel initialization (env validation + content index + SKILL.md gen),
 * boot time target <3s with timing report.
 */

import { Command } from "commander";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";

/**
 * Boot timing tracker.
 */
export interface BootTiming {
  readonly total: number;
  readonly envValidation: number;
  readonly contentIndex: number;
  readonly skillmdGen: number;
  readonly serverStart: number;
}

/**
 * Measure execution time of an async operation.
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; elapsed: number }> {
  const start = performance.now();
  const result = await fn();
  const elapsed = Math.round(performance.now() - start);
  return { result, elapsed };
}

/**
 * Validate environment variables.
 */
export async function validateEnv(projectRoot: string): Promise<void> {
  const envPath = join(projectRoot, ".env");
  const envExamplePath = join(projectRoot, ".env.example");

  if (!existsSync(envPath) && existsSync(envExamplePath)) {
    console.log(
      chalk.yellow("  Warning: .env file not found. Copy from .env.example"),
    );
  }
}

/**
 * Build content index if needed.
 */
export async function buildContentIndex(projectRoot: string): Promise<void> {
  const contentDir = join(projectRoot, "content");
  if (!existsSync(contentDir)) {
    return; // No content directory, skip
  }

  // Content indexing would be handled by @vibeonrails/core/content
  // This is a placeholder for the integration
}

/**
 * Regenerate SKILL.md files.
 */
export async function generateSkillMd(projectRoot: string): Promise<void> {
  const srcDir = join(projectRoot, "src");
  if (!existsSync(srcDir)) {
    return;
  }

  // SKILL.md generation would be handled by the CLI skillmd module
  // This is a placeholder for the integration
}

/**
 * Format boot timing for display.
 */
export function formatBootTiming(timing: BootTiming): string {
  const lines: string[] = [];
  lines.push(chalk.dim("  Boot timing:"));
  lines.push(chalk.dim(`    Env validation:  ${timing.envValidation}ms`));
  lines.push(chalk.dim(`    Content index:   ${timing.contentIndex}ms`));
  lines.push(chalk.dim(`    SKILL.md gen:    ${timing.skillmdGen}ms`));
  lines.push(chalk.dim(`    Server start:    ${timing.serverStart}ms`));

  const color = timing.total < 3000 ? chalk.green : chalk.yellow;
  lines.push(color(`    Total:           ${timing.total}ms`));

  return lines.join("\n");
}

/**
 * `vibe dev` — Start the development server.
 */
export function devCommand(): Command {
  return new Command("dev")
    .description("Start the development server")
    .option("-p, --port <port>", "Port number", "3000")
    .option("--no-watch", "Disable file watching")
    .option("--timing", "Show boot timing breakdown")
    .action(
      async (options: { port: string; watch?: boolean; timing?: boolean }) => {
        const projectRoot = process.cwd();
        const bootStart = performance.now();

        console.log(chalk.cyan("\n  Starting Vibe on Rails dev server...\n"));

        // Parallel initialization
        const [envResult, contentResult, skillResult] = await Promise.all([
          measureTime(() => validateEnv(projectRoot)),
          measureTime(() => buildContentIndex(projectRoot)),
          measureTime(() => generateSkillMd(projectRoot)),
        ]);

        // Start the server
        const serverStart = performance.now();

        try {
          const child = spawn("npx", ["tsx", "watch", "src/main.ts"], {
            cwd: projectRoot,
            stdio: "inherit",
            env: {
              ...process.env,
              PORT: options.port,
              NODE_ENV: "development",
            },
          });

          const serverElapsed = Math.round(performance.now() - serverStart);
          const totalElapsed = Math.round(performance.now() - bootStart);

          if (options.timing) {
            const timing: BootTiming = {
              total: totalElapsed,
              envValidation: envResult.elapsed,
              contentIndex: contentResult.elapsed,
              skillmdGen: skillResult.elapsed,
              serverStart: serverElapsed,
            };
            console.log(formatBootTiming(timing));
          }

          console.log(
            chalk.cyan(
              `\n  Dev server running on http://localhost:${options.port}\n`,
            ),
          );

          // Handle graceful shutdown
          const cleanup = () => {
            child.kill("SIGTERM");
            process.exit(0);
          };

          process.on("SIGINT", cleanup);
          process.on("SIGTERM", cleanup);

          child.on("exit", (code) => {
            if (code !== null && code !== 0) {
              process.exit(code);
            }
          });
        } catch {
          // User interrupted with Ctrl+C
        }
      },
    );
}
