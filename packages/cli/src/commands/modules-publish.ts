/**
 * `vibe modules publish` — Publish a module to npm following VoR conventions.
 *
 * Validates module structure (SKILL.md, barrel exports, types),
 * builds the package, and publishes to npm registry.
 *
 * `vibe modules list --community` discovers community VoR modules on npm.
 */

import { Command } from "commander";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Validation result for a module.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Module metadata extracted from package.json and SKILL.md.
 */
export interface ModuleMetadata {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly hasSkillMd: boolean;
  readonly hasBarrelExport: boolean;
  readonly hasTypes: boolean;
  readonly hasBuildScript: boolean;
  readonly hasTestScript: boolean;
}

/**
 * Community module discovered on npm.
 */
export interface CommunityModule {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly downloads: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate module structure follows VoR conventions.
 */
export function validateModuleStructure(
  moduleDir: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. package.json must exist
  const pkgPath = join(moduleDir, "package.json");
  if (!existsSync(pkgPath)) {
    errors.push("Missing package.json");
    return { valid: false, errors, warnings };
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
  } catch {
    errors.push("Invalid package.json — could not parse JSON");
    return { valid: false, errors, warnings };
  }

  // 2. Package name must follow VoR convention
  const name = pkg["name"] as string | undefined;
  if (!name) {
    errors.push("package.json missing 'name' field");
  } else if (
    !name.startsWith("@vibeonrails/") &&
    !name.startsWith("vibeonrails-") &&
    !name.startsWith("vor-")
  ) {
    warnings.push(
      `Package name "${name}" does not follow VoR naming: @vibeonrails/<name>, vibeonrails-<name>, or vor-<name>`,
    );
  }

  // 3. SKILL.md must exist
  const skillPath = join(moduleDir, "SKILL.md");
  if (!existsSync(skillPath)) {
    errors.push(
      "Missing SKILL.md — every VoR module must have a SKILL.md that teaches AI agents how to use it",
    );
  }

  // 4. Barrel export (index.ts or index.js) must exist
  const srcDir = join(moduleDir, "src");
  const hasBarrel =
    existsSync(join(srcDir, "index.ts")) ||
    existsSync(join(srcDir, "index.js")) ||
    existsSync(join(moduleDir, "index.ts")) ||
    existsSync(join(moduleDir, "index.js"));
  if (!hasBarrel) {
    errors.push(
      "Missing barrel export — module must have src/index.ts or index.ts",
    );
  }

  // 5. Types — check for TypeScript config
  const hasTsConfig =
    existsSync(join(moduleDir, "tsconfig.json")) ||
    existsSync(join(moduleDir, "tsconfig.build.json"));
  if (!hasTsConfig) {
    warnings.push("No tsconfig.json found — types may not be generated");
  }

  // 6. Exports field in package.json
  const exports = pkg["exports"] as Record<string, unknown> | undefined;
  if (!exports) {
    warnings.push(
      "package.json missing 'exports' field — consumers may have import issues",
    );
  } else {
    // Check for types export
    const mainExport = exports["."] as Record<string, unknown> | undefined;
    if (mainExport && !mainExport["types"]) {
      warnings.push(
        "package.json exports['.'] missing 'types' — TypeScript users will not get type definitions",
      );
    }
  }

  // 7. Build script
  const scripts = pkg["scripts"] as Record<string, string> | undefined;
  if (!scripts || !scripts["build"]) {
    errors.push("package.json missing 'build' script");
  }

  // 8. Test script
  if (!scripts || !scripts["test"]) {
    warnings.push("No test script found — consider adding tests");
  }

  // 9. ESM module type
  if (pkg["type"] !== "module") {
    warnings.push(
      'package.json should have "type": "module" for ESM compatibility',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract module metadata from a directory.
 */
export function extractModuleMetadata(
  moduleDir: string,
): ModuleMetadata | null {
  const pkgPath = join(moduleDir, "package.json");
  if (!existsSync(pkgPath)) return null;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }

  const srcDir = join(moduleDir, "src");
  const scripts = pkg["scripts"] as Record<string, string> | undefined;

  return {
    name: (pkg["name"] as string) ?? "unknown",
    version: (pkg["version"] as string) ?? "0.0.0",
    description: (pkg["description"] as string) ?? "",
    hasSkillMd: existsSync(join(moduleDir, "SKILL.md")),
    hasBarrelExport:
      existsSync(join(srcDir, "index.ts")) ||
      existsSync(join(srcDir, "index.js")),
    hasTypes: existsSync(join(moduleDir, "tsconfig.json")),
    hasBuildScript: scripts?.["build"] !== undefined,
    hasTestScript: scripts?.["test"] !== undefined,
  };
}

/**
 * Search npm registry for community VoR modules.
 *
 * Searches for packages matching VoR naming conventions.
 * Returns module metadata from the npm registry.
 */
export async function searchCommunityModules(
  query = "vibeonrails",
): Promise<readonly CommunityModule[]> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=50`,
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      objects: Array<{
        package: {
          name: string;
          version: string;
          description: string;
        };
        downloads?: { weekly: number };
      }>;
    };

    return data.objects
      .filter(
        (obj) =>
          obj.package.name.startsWith("@vibeonrails/") ||
          obj.package.name.startsWith("vibeonrails-") ||
          obj.package.name.startsWith("vor-"),
      )
      .map((obj) => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description ?? "",
        downloads: obj.downloads?.weekly ?? 0,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * `vibe modules publish` command.
 */
export function modulesPublishCommand(): Command {
  const cmd = new Command("publish")
    .description(
      "Validate and publish a module to npm following VoR conventions",
    )
    .option("--dry-run", "Validate without publishing")
    .option("--dir <dir>", "Module directory (default: current directory)")
    .action(async (options: { dryRun?: boolean; dir?: string }) => {
      const formatter = createFormatter();
      const moduleDir = resolve(options.dir ?? process.cwd());

      formatter.info(`Validating module at ${moduleDir}...`);

      // Validate structure
      const validation = validateModuleStructure(moduleDir);

      // Show errors
      if (validation.errors.length > 0) {
        console.log(chalk.red("\n  Validation errors:\n"));
        for (const error of validation.errors) {
          console.log(chalk.red(`    - ${error}`));
        }
      }

      // Show warnings
      if (validation.warnings.length > 0) {
        console.log(chalk.yellow("\n  Warnings:\n"));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`    - ${warning}`));
        }
      }

      if (!validation.valid) {
        formatter.error({
          command: "modules publish",
          message: "Module validation failed. Fix the errors above before publishing.",
        });
        process.exit(1);
      }

      const metadata = extractModuleMetadata(moduleDir);

      if (options.dryRun) {
        formatter.success({
          command: "modules publish",
          data: { metadata, validation },
          message: `Module "${metadata?.name ?? "unknown"}" is valid and ready to publish.`,
          warnings: validation.warnings as string[],
          nextSteps: [
            "Run without --dry-run to publish to npm",
            "Make sure you are logged in: npm login",
          ],
        });
        return;
      }

      // Build the module
      const spinner = (await import("ora")).default("Building module...").start();
      try {
        const { execSync } = await import("node:child_process");
        execSync("pnpm run build", { cwd: moduleDir, stdio: "pipe" });
        spinner.succeed("Module built successfully");
      } catch {
        spinner.fail("Build failed");
        formatter.error({
          command: "modules publish",
          message: "Build failed. Fix build errors before publishing.",
        });
        process.exit(1);
      }

      // Publish to npm
      const publishSpinner = (await import("ora"))
        .default("Publishing to npm...")
        .start();
      try {
        const { execSync } = await import("node:child_process");
        execSync("npm publish --access public", {
          cwd: moduleDir,
          stdio: "pipe",
        });
        publishSpinner.succeed("Published to npm");
      } catch (error: unknown) {
        publishSpinner.fail("Publish failed");
        const message =
          error instanceof Error ? error.message : String(error);
        formatter.error({
          command: "modules publish",
          message: `npm publish failed: ${message}`,
          fix: "Make sure you are logged in (npm login) and the package name is available",
        });
        process.exit(1);
      }

      formatter.success({
        command: "modules publish",
        data: { name: metadata?.name, version: metadata?.version },
        message: `Module "${metadata?.name}@${metadata?.version}" published successfully!`,
        nextSteps: [
          `Install in any VoR project: npx vibe add ${metadata?.name}`,
          "Add it to the community registry: https://vibeonrails.dev/community",
        ],
      });
    });

  return cmd;
}

/**
 * `vibe modules list --community` subcommand (extends existing modules command).
 */
export function modulesListCommunityCommand(): Command {
  const cmd = new Command("community")
    .description("Discover community VoR modules on npm")
    .option("--query <query>", "Custom search query", "vibeonrails")
    .action(async (options: { query: string }) => {
      const formatter = createFormatter();

      formatter.info("Searching npm for VoR community modules...");

      const modules = await searchCommunityModules(options.query);

      if (modules.length === 0) {
        formatter.info("No community modules found.");
        return;
      }

      formatter.table(
        ["Name", "Version", "Description", "Weekly Downloads"],
        modules.map((m) => [
          m.name,
          m.version,
          m.description.substring(0, 60),
          String(m.downloads),
        ]),
      );

      formatter.success({
        command: "modules community",
        data: { modules, total: modules.length },
        message: `Found ${modules.length} community module(s)`,
        nextSteps: ["Install a module: npx vibe add <module-name>"],
      });
    });

  return cmd;
}
