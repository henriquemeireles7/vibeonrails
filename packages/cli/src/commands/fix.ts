/**
 * Auto-Fixer
 *
 * `vibe fix` — Scans project for all errors (type errors, missing env vars,
 * broken configs). Auto-fixes everything marked auto_fixable in error catalog.
 * Reports what was fixed and what needs human decision.
 */

import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectedIssue {
  id: string;
  category: "env" | "config" | "types" | "deps" | "security";
  severity: "error" | "warning";
  description: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
  fix?: () => void;
  fixDescription?: string;
}

export interface FixResult {
  totalIssues: number;
  autoFixed: number;
  needsHuman: number;
  fixed: Array<{ id: string; description: string }>;
  manual: Array<{ id: string; description: string; suggestion: string }>;
}

// ---------------------------------------------------------------------------
// Issue Detectors
// ---------------------------------------------------------------------------

/** Check for missing .env variables by scanning .env.example. */
export function detectMissingEnvVars(projectRoot: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const examplePath = join(projectRoot, ".env.example");
  const envPath = join(projectRoot, ".env");

  if (!existsSync(examplePath)) return issues;

  const exampleContent = readFileSync(examplePath, "utf-8");
  const requiredVars = exampleContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => line.split("=")[0]!.trim());

  let envVars: Set<string> = new Set();
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    envVars = new Set(
      envContent
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .map((line) => line.split("=")[0]!.trim()),
    );
  }

  for (const v of requiredVars) {
    if (!envVars.has(v)) {
      issues.push({
        id: `env-missing-${v}`,
        category: "env",
        severity: "error",
        description: `Missing environment variable: ${v}`,
        file: ".env",
        autoFixable: true,
        fixDescription: `Add ${v}= to .env`,
        fix: () => {
          const currentContent = existsSync(envPath)
            ? readFileSync(envPath, "utf-8")
            : "";
          const exampleLine = exampleContent
            .split("\n")
            .find((l) => l.startsWith(`${v}=`));
          const newLine = exampleLine ?? `${v}=`;
          writeFileSync(
            envPath,
            currentContent ? `${currentContent}\n${newLine}` : newLine,
            "utf-8",
          );
        },
      });
    }
  }

  return issues;
}

/** Check for common config issues. */
export function detectConfigIssues(projectRoot: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  // Check for package.json
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) {
    issues.push({
      id: "config-no-package-json",
      category: "config",
      severity: "error",
      description: "No package.json found in project root",
      autoFixable: false,
      fixDescription: "Run `npm init` or `pnpm init` to create package.json",
    });
    return issues;
  }

  // Check for tsconfig.json
  const tsconfigPath = join(projectRoot, "tsconfig.json");
  if (!existsSync(tsconfigPath)) {
    issues.push({
      id: "config-no-tsconfig",
      category: "config",
      severity: "warning",
      description: "No tsconfig.json found",
      autoFixable: false,
      fixDescription: "Run `npx tsc --init` to create tsconfig.json",
    });
  }

  return issues;
}

/** Check for TypeScript errors using tsc --noEmit. */
export function detectTypeErrors(projectRoot: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const tsconfigPath = join(projectRoot, "tsconfig.json");
  if (!existsSync(tsconfigPath)) return issues;

  try {
    execSync("npx tsc --noEmit 2>&1", {
      cwd: projectRoot,
      encoding: "utf-8",
    });
  } catch (error) {
    const output =
      error instanceof Error && "stdout" in error
        ? (error as { stdout: string }).stdout
        : "";

    if (output) {
      // Parse TypeScript errors
      const errorLines = output.split("\n").filter((l) => l.includes("error TS"));
      for (const line of errorLines.slice(0, 20)) {
        const match = line.match(/^(.+)\((\d+),\d+\):\s*error\s+(TS\d+):\s*(.+)/);
        if (match) {
          issues.push({
            id: `type-${match[3]}-${match[1]}-${match[2]}`,
            category: "types",
            severity: "error",
            description: match[4]!,
            file: match[1],
            line: parseInt(match[2]!, 10),
            autoFixable: false,
            fixDescription: `Fix TypeScript error ${match[3]} in ${match[1]}:${match[2]}`,
          });
        }
      }
    }
  }

  return issues;
}

/** Check for missing dependencies. */
export function detectMissingDeps(projectRoot: string): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lockFiles = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"];
  const hasLockFile = lockFiles.some((f) => existsSync(join(projectRoot, f)));
  const hasNodeModules = existsSync(join(projectRoot, "node_modules"));

  if (!hasNodeModules && hasLockFile) {
    issues.push({
      id: "deps-not-installed",
      category: "deps",
      severity: "error",
      description: "Dependencies not installed (node_modules missing)",
      autoFixable: true,
      fixDescription: "Run package manager install",
      fix: () => {
        const pm = existsSync(join(projectRoot, "pnpm-lock.yaml"))
          ? "pnpm"
          : existsSync(join(projectRoot, "yarn.lock"))
            ? "yarn"
            : "npm";
        execSync(`${pm} install`, { cwd: projectRoot, stdio: "pipe" });
      },
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/** Run all detectors and collect issues. */
export function detectAllIssues(projectRoot: string): DetectedIssue[] {
  return [
    ...detectMissingEnvVars(projectRoot),
    ...detectConfigIssues(projectRoot),
    ...detectMissingDeps(projectRoot),
    // Type errors are slow; only run if other checks pass
  ];
}

/** Auto-fix all fixable issues and return results. */
export function autoFix(projectRoot: string): FixResult {
  const issues = detectAllIssues(projectRoot);
  const fixed: Array<{ id: string; description: string }> = [];
  const manual: Array<{
    id: string;
    description: string;
    suggestion: string;
  }> = [];

  for (const issue of issues) {
    if (issue.autoFixable && issue.fix) {
      try {
        issue.fix();
        fixed.push({ id: issue.id, description: issue.description });
      } catch {
        manual.push({
          id: issue.id,
          description: issue.description,
          suggestion: issue.fixDescription ?? "Manual fix required",
        });
      }
    } else {
      manual.push({
        id: issue.id,
        description: issue.description,
        suggestion: issue.fixDescription ?? "Manual fix required",
      });
    }
  }

  return {
    totalIssues: issues.length,
    autoFixed: fixed.length,
    needsHuman: manual.length,
    fixed,
    manual,
  };
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe fix` — Scan and auto-fix project issues.
 */
export function fixCommand(): Command {
  return new Command("fix")
    .description("Scan for errors and auto-fix what's possible")
    .option("--scan-only", "Only scan, don't apply fixes")
    .option("--include-types", "Include TypeScript error checking (slow)")
    .option("--json", "Output as JSON")
    .action(
      (options: {
        scanOnly?: boolean;
        includeTypes?: boolean;
        json?: boolean;
      }) => {
        const fmt = createFormatter();
        const projectRoot = process.cwd();

        if (options.scanOnly) {
          let issues = detectAllIssues(projectRoot);
          if (options.includeTypes) {
            issues = [...issues, ...detectTypeErrors(projectRoot)];
          }

          if (options.json) {
            console.log(
              JSON.stringify(
                issues.map(({ fix, ...rest }) => rest),
                null,
                2,
              ),
            );
            return;
          }

          if (issues.length === 0) {
            fmt.success({
              command: "fix",
              data: { issues: 0 },
              message: chalk.green("No issues found!"),
            });
            return;
          }

          fmt.info(chalk.bold(`\nFound ${issues.length} issue(s):\n`));
          for (const issue of issues) {
            const icon = issue.autoFixable
              ? chalk.green("*")
              : chalk.yellow("!");
            const severity =
              issue.severity === "error"
                ? chalk.red("ERROR")
                : chalk.yellow("WARN");
            console.log(
              `  ${icon} ${severity} [${issue.category}] ${issue.description}`,
            );
            if (issue.file) {
              console.log(
                chalk.dim(
                  `    ${issue.file}${issue.line ? `:${issue.line}` : ""}`,
                ),
              );
            }
            if (issue.fixDescription) {
              console.log(chalk.dim(`    Fix: ${issue.fixDescription}`));
            }
          }
          console.log(
            chalk.dim(
              `\n  (* = auto-fixable, ! = needs human decision)\n`,
            ),
          );
          return;
        }

        // Apply fixes
        fmt.info(chalk.dim("Scanning project for issues..."));
        const result = autoFix(projectRoot);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (result.totalIssues === 0) {
          fmt.success({
            command: "fix",
            data: result,
            message: chalk.green("No issues found! Project looks healthy."),
          });
          return;
        }

        if (result.autoFixed > 0) {
          console.log(
            chalk.green.bold(`\n  Auto-fixed ${result.autoFixed} issue(s):\n`),
          );
          for (const f of result.fixed) {
            console.log(`  ${chalk.green("*")} ${f.description}`);
          }
        }

        if (result.needsHuman > 0) {
          console.log(
            chalk.yellow.bold(
              `\n  ${result.needsHuman} issue(s) need manual attention:\n`,
            ),
          );
          for (const m of result.manual) {
            console.log(`  ${chalk.yellow("!")} ${m.description}`);
            console.log(chalk.dim(`    Suggestion: ${m.suggestion}`));
          }
        }

        console.log();
      },
    );
}
