import { Command } from "commander";
import { execSync } from "node:child_process";
import chalk from "chalk";
import ora from "ora";

/**
 * `vibe build` — Production build.
 */
export function buildCommand(): Command {
  return new Command("build")
    .description("Build the project for production")
    .action(() => {
      const spinner = ora("Building for production...").start();

      try {
        execSync("npx tsup", {
          cwd: process.cwd(),
          stdio: "pipe",
        });
        spinner.succeed("Production build complete.");
        console.log(chalk.dim("\n  Output in ./dist\n"));
      } catch (error) {
        spinner.fail("Build failed.");
        if (error instanceof Error && "stdout" in error) {
          console.error((error as { stdout: Buffer }).stdout?.toString());
        }
        process.exit(1);
      }
    });
}
