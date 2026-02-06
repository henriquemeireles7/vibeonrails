import { Command } from "commander";
import { join } from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { copyDir, replaceInFile, ensureDir } from "../utils/fs.js";
import { toKebabCase } from "../utils/template.js";

/**
 * `vibe create <name>` — Scaffold a new Vibe on Rails project from the app template.
 */
export function createCommand(): Command {
  return new Command("create")
    .description("Create a new Vibe on Rails project")
    .argument("<name>", "Project name (e.g. my-app)")
    .option("--skip-install", "Skip dependency installation")
    .action(async (name: string, options: { skipInstall?: boolean }) => {
      const projectName = toKebabCase(name);
      const targetDir = join(process.cwd(), projectName);

      if (existsSync(targetDir)) {
        console.error(
          chalk.red(`\n  Error: Directory "${projectName}" already exists.\n`),
        );
        process.exit(1);
      }

      console.log(
        chalk.bold(
          `\n  Creating ${chalk.cyan(projectName)} ...\n`,
        ),
      );

      const spinner = ora("Copying project template...").start();

      try {
        // Resolve template directory (relative to compiled CLI)
        const cliRoot = join(
          new URL(".", import.meta.url).pathname,
          "..",
          "..",
        );
        const templateDir = join(cliRoot, "templates", "app");

        if (!existsSync(templateDir)) {
          spinner.fail("App template not found. Is @vibeonrails/cli installed correctly?");
          process.exit(1);
        }

        // Copy template
        ensureDir(targetDir);
        copyDir(templateDir, targetDir);

        // Replace placeholders
        const filesToPatch = [
          "package.json",
          "README.md",
        ];

        for (const file of filesToPatch) {
          const filePath = join(targetDir, file);
          if (existsSync(filePath)) {
            replaceInFile(filePath, "{{projectName}}", projectName);
          }
        }

        spinner.succeed("Project template copied.");

        // Install dependencies
        if (!options.skipInstall) {
          const installSpinner = ora("Installing dependencies...").start();
          try {
            const { execSync } = await import("node:child_process");
            execSync("pnpm install", {
              cwd: targetDir,
              stdio: "pipe",
            });
            installSpinner.succeed("Dependencies installed.");
          } catch {
            installSpinner.warn(
              "Could not install dependencies. Run `pnpm install` manually.",
            );
          }
        }

        console.log(
          chalk.green(`\n  ✓ Project created at ./${projectName}\n`),
        );
        console.log("  Next steps:\n");
        console.log(`    cd ${projectName}`);
        if (options.skipInstall) {
          console.log("    pnpm install");
        }
        console.log("    cp .env.example .env");
        console.log("    pnpm run dev\n");
      } catch (error) {
        spinner.fail("Failed to create project.");
        console.error(error);
        process.exit(1);
      }
    });
}
