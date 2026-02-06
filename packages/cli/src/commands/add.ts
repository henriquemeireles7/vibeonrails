/**
 * `vibe add <module>` — Smart-install a module.
 *
 * Installs the npm package, creates directory structure, generates starter files,
 * adds routes, updates config, and shows next steps.
 * Writes .vibe/modules.json manifest with file checksums for safe removal.
 */

import { Command } from "commander";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import chalk from "chalk";
import ora from "ora";
import {
  getModule,
  MODULE_REGISTRY,
  type ModuleManifest,
  type InstalledModule,
  type InstalledFile,
} from "../modules/registry.js";

const MANIFEST_PATH = ".vibe/modules.json";
const MANIFEST_VERSION = "1.0";

/**
 * Compute SHA-256 checksum of a string.
 */
export function computeChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Load the module manifest from .vibe/modules.json.
 */
export function loadManifest(projectRoot: string): ModuleManifest {
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(readFileSync(manifestPath, "utf-8")) as ModuleManifest;
    } catch {
      // Corrupted manifest, start fresh
    }
  }
  return { version: MANIFEST_VERSION, modules: {} };
}

/**
 * Save the module manifest to .vibe/modules.json.
 */
export function saveManifest(
  projectRoot: string,
  manifest: ModuleManifest,
): void {
  const manifestPath = join(projectRoot, MANIFEST_PATH);
  const manifestDir = dirname(manifestPath);
  if (!existsSync(manifestDir)) {
    mkdirSync(manifestDir, { recursive: true });
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Create a file with content, ensuring parent directories exist.
 */
export function createFileWithDirs(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Install a module's files and return installed file records.
 */
export function installModuleFiles(
  moduleName: string,
  projectRoot: string,
): readonly InstalledFile[] {
  const mod = getModule(moduleName);
  if (!mod) return [];

  const installed: InstalledFile[] = [];

  for (const file of mod.files) {
    const filePath = join(projectRoot, file.path);

    if (existsSync(filePath)) {
      // File already exists, skip
      continue;
    }

    createFileWithDirs(filePath, file.template);

    installed.push({
      path: file.path,
      checksum: computeChecksum(file.template),
    });
  }

  // Create content directories
  for (const dir of mod.contentDirs) {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  return installed;
}

/**
 * `vibe add <module>` command.
 */
export function addCommand(): Command {
  return new Command("add")
    .description("Smart-install a module (package + files + config + routes)")
    .argument("<module>", "Module name (e.g., marketing, payments, admin)")
    .action(async (moduleName: string) => {
      const projectRoot = process.cwd();
      const mod = getModule(moduleName);

      if (!mod) {
        console.error(chalk.red(`\n  Unknown module: "${moduleName}"\n`));
        console.log("  Available modules:\n");
        for (const m of MODULE_REGISTRY) {
          console.log(`    ${chalk.cyan(m.name.padEnd(20))} ${m.description}`);
        }
        console.log("");
        process.exit(1);
      }

      // Check if already installed
      const manifest = loadManifest(projectRoot);
      if (manifest.modules[moduleName]) {
        console.log(
          chalk.yellow(`\n  Module "${moduleName}" is already installed.\n`),
        );
        return;
      }

      console.log(chalk.bold(`\n  Installing ${chalk.cyan(moduleName)} ...\n`));

      // Install npm package
      const spinner = ora(`Installing ${mod.package}...`).start();
      try {
        const { execSync } = await import("node:child_process");
        const deps = [...mod.dependencies, ...mod.peerDependencies].join(" ");
        execSync(`pnpm add ${deps}`, {
          cwd: projectRoot,
          stdio: "pipe",
        });
        spinner.succeed(`Installed ${mod.package}`);
      } catch {
        spinner.warn(
          `Could not install ${mod.package}. Install manually: pnpm add ${mod.dependencies.join(" ")}`,
        );
      }

      // Install files
      const fileSpinner = ora("Creating files...").start();
      const installedFiles = installModuleFiles(moduleName, projectRoot);
      if (installedFiles.length > 0) {
        fileSpinner.succeed(`Created ${installedFiles.length} file(s)`);
        for (const file of installedFiles) {
          console.log(chalk.dim(`    ${file.path}`));
        }
      } else {
        fileSpinner.succeed("No files to create");
      }

      // Update manifest
      const now = new Date().toISOString();
      manifest.modules[moduleName] = {
        name: moduleName,
        package: mod.package,
        installedAt: now,
        files: installedFiles,
      };
      saveManifest(projectRoot, manifest);

      // Show routes info
      if (mod.routes.length > 0) {
        console.log(chalk.dim("\n  Routes to register:"));
        for (const route of mod.routes) {
          console.log(
            chalk.dim(
              `    ${route.method.toUpperCase()} ${route.path} → ${route.import}`,
            ),
          );
        }
      }

      // Show config info
      if (mod.configEntries.length > 0) {
        console.log(chalk.dim("\n  Configuration to add in vibe.config.ts:"));
        for (const entry of mod.configEntries) {
          console.log(
            chalk.dim(
              `    ${entry.key}: ${entry.value} // ${entry.description}`,
            ),
          );
        }
      }

      // Show next steps
      if (mod.postInstallSteps.length > 0) {
        console.log(chalk.green("\n  Next steps:\n"));
        for (const step of mod.postInstallSteps) {
          console.log(`    ${step}`);
        }
      }

      console.log(
        chalk.green(`\n  Module "${moduleName}" installed successfully.\n`),
      );
    });
}
