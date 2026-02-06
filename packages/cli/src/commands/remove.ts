/**
 * `vibe remove <module>` — Clean-remove a module.
 *
 * Uses .vibe/modules.json manifest to safely remove files, dependencies, and routes.
 * Deletes unmodified files (checksum match), warns about modified files.
 */

import { Command } from "commander";
import { existsSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { join, dirname } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { getModule } from "../modules/registry.js";
import { computeChecksum, loadManifest, saveManifest } from "./add.js";

/**
 * Result of removing a module's files.
 */
export interface RemoveResult {
  readonly removed: readonly string[];
  readonly modified: readonly string[];
  readonly missing: readonly string[];
}

/**
 * Remove a module's files, checking checksums for safety.
 */
export function removeModuleFiles(
  moduleName: string,
  projectRoot: string,
): RemoveResult {
  const manifest = loadManifest(projectRoot);
  const installed = manifest.modules[moduleName];

  if (!installed) {
    return { removed: [], modified: [], missing: [] };
  }

  const removed: string[] = [];
  const modified: string[] = [];
  const missing: string[] = [];

  for (const file of installed.files) {
    const filePath = join(projectRoot, file.path);

    if (!existsSync(filePath)) {
      missing.push(file.path);
      continue;
    }

    const currentContent = readFileSync(filePath, "utf-8");
    const currentChecksum = computeChecksum(currentContent);

    if (currentChecksum === file.checksum) {
      // File unmodified, safe to delete
      unlinkSync(filePath);
      removed.push(file.path);

      // Try to remove empty parent directories
      tryRemoveEmptyDir(dirname(filePath));
    } else {
      // File was modified by user
      modified.push(file.path);
    }
  }

  return { removed, modified, missing };
}

/**
 * Try to remove an empty directory and its empty parents.
 */
function tryRemoveEmptyDir(dirPath: string): void {
  try {
    rmdirSync(dirPath);
    // If successful, try parent too
    tryRemoveEmptyDir(dirname(dirPath));
  } catch {
    // Directory not empty or other error, stop
  }
}

/**
 * `vibe remove <module>` command.
 */
export function removeCommand(): Command {
  return new Command("remove")
    .description("Clean-remove a module (files + deps + routes)")
    .argument("<module>", "Module name to remove")
    .option("--force", "Remove modified files without warning")
    .action(async (moduleName: string, options: { force?: boolean }) => {
      const projectRoot = process.cwd();
      const manifest = loadManifest(projectRoot);

      if (!manifest.modules[moduleName]) {
        console.error(
          chalk.red(`\n  Module "${moduleName}" is not installed.\n`),
        );
        process.exit(1);
      }

      const mod = getModule(moduleName);

      console.log(chalk.bold(`\n  Removing ${chalk.cyan(moduleName)} ...\n`));

      // Remove files
      const fileSpinner = ora("Removing files...").start();
      const result = removeModuleFiles(moduleName, projectRoot);

      if (result.removed.length > 0) {
        fileSpinner.succeed(`Removed ${result.removed.length} file(s)`);
        for (const file of result.removed) {
          console.log(chalk.dim(`    ${file}`));
        }
      } else {
        fileSpinner.succeed("No files to remove");
      }

      // Warn about modified files
      if (result.modified.length > 0 && !options.force) {
        console.log(chalk.yellow("\n  Modified files (remove manually):"));
        for (const file of result.modified) {
          console.log(chalk.yellow(`    ${file}`));
        }
      }

      // Remove npm package
      if (mod) {
        const depSpinner = ora(`Removing ${mod.package}...`).start();
        try {
          const { execSync } = await import("node:child_process");
          execSync(`pnpm remove ${mod.package}`, {
            cwd: projectRoot,
            stdio: "pipe",
          });
          depSpinner.succeed(`Removed ${mod.package}`);
        } catch {
          depSpinner.warn(
            `Could not remove ${mod.package}. Remove manually: pnpm remove ${mod.package}`,
          );
        }
      }

      // Show route cleanup info
      if (mod?.routes && mod.routes.length > 0) {
        console.log(chalk.dim("\n  Routes to remove from your router:"));
        for (const route of mod.routes) {
          console.log(
            chalk.dim(`    ${route.method.toUpperCase()} ${route.path}`),
          );
        }
      }

      // Update manifest
      delete manifest.modules[moduleName];
      saveManifest(projectRoot, manifest);

      console.log(chalk.green(`\n  Module "${moduleName}" removed.\n`));
    });
}
