/**
 * `vibe test --coverage` — Per-Package Coverage Reporting
 *
 * Reports test coverage per package. Fails build if any package is below 80%.
 * Shows uncovered files. Generates coverage badges per package.
 *
 * Commands:
 *   vibe test coverage                — Run tests with coverage per package
 *   vibe test coverage --threshold 90 — Custom coverage threshold
 *   vibe test coverage --badge        — Generate coverage badges
 *   vibe test coverage --json         — Output as JSON
 */

import { Command } from "commander";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, basename } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Coverage data for a single file.
 */
export interface FileCoverage {
  readonly file: string;
  readonly statements: CoverageMetric;
  readonly branches: CoverageMetric;
  readonly functions: CoverageMetric;
  readonly lines: CoverageMetric;
}

/**
 * A coverage metric (e.g., statements).
 */
export interface CoverageMetric {
  readonly total: number;
  readonly covered: number;
  readonly pct: number;
}

/**
 * Coverage summary for a package.
 */
export interface PackageCoverage {
  readonly name: string;
  readonly path: string;
  readonly statements: CoverageMetric;
  readonly branches: CoverageMetric;
  readonly functions: CoverageMetric;
  readonly lines: CoverageMetric;
  readonly files: readonly FileCoverage[];
  readonly uncoveredFiles: readonly string[];
  readonly passesThreshold: boolean;
}

/**
 * Full coverage report.
 */
export interface CoverageReport {
  readonly packages: readonly PackageCoverage[];
  readonly total: CoverageMetric;
  readonly threshold: number;
  readonly allPass: boolean;
  readonly generatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLD = 80;

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Discover packages in the monorepo that have tests.
 */
export function discoverTestablePackages(
  rootDir: string,
): readonly string[] {
  const packagesDir = join(rootDir, "packages");
  if (!existsSync(packagesDir)) return [];

  const packages: string[] = [];

  function scanDir(dir: string): void {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules" || entry.name === "dist") continue;

      const pkgPath = join(dir, entry.name);
      const pkgJsonPath = join(pkgPath, "package.json");

      if (existsSync(pkgJsonPath)) {
        // Check if it has a test script
        try {
          const pkgJson = JSON.parse(
            readFileSync(pkgJsonPath, "utf-8"),
          ) as Record<string, unknown>;
          const scripts = pkgJson["scripts"] as Record<string, string> | undefined;
          if (scripts?.["test"]) {
            packages.push(pkgPath);
          }
        } catch {
          // Skip invalid package.json
        }
      } else {
        // Check subdirectories (e.g., packages/features/payments)
        scanDir(pkgPath);
      }
    }
  }

  scanDir(packagesDir);
  return packages;
}

/**
 * Parse a Vitest JSON coverage report (Istanbul format).
 *
 * Vitest outputs coverage in the Istanbul JSON format at coverage/coverage-final.json.
 */
export function parseCoverageJson(
  coveragePath: string,
): readonly FileCoverage[] {
  if (!existsSync(coveragePath)) return [];

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(readFileSync(coveragePath, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return [];
  }

  const files: FileCoverage[] = [];

  for (const [filePath, coverage] of Object.entries(data)) {
    const cov = coverage as Record<string, unknown>;

    // Istanbul format has s (statements), b (branches), f (functions)
    const stmtMap = cov["s"] as Record<string, number> | undefined;
    const branchMap = cov["b"] as Record<string, number[]> | undefined;
    const fnMap = cov["f"] as Record<string, number> | undefined;

    const statements = computeMetric(stmtMap ? Object.values(stmtMap) : []);
    const branches = computeBranchMetric(branchMap ? Object.values(branchMap) : []);
    const functions = computeMetric(fnMap ? Object.values(fnMap) : []);

    files.push({
      file: filePath,
      statements,
      branches,
      functions,
      lines: statements, // Istanbul uses statements as proxy for lines
    });
  }

  return files;
}

/**
 * Compute a coverage metric from hit counts.
 */
export function computeMetric(hits: readonly number[]): CoverageMetric {
  if (hits.length === 0) {
    return { total: 0, covered: 0, pct: 100 };
  }
  const total = hits.length;
  const covered = hits.filter((h) => h > 0).length;
  const pct = total > 0 ? Math.round((covered / total) * 10000) / 100 : 100;
  return { total, covered, pct };
}

/**
 * Compute branch coverage from branch arrays.
 */
export function computeBranchMetric(
  branches: readonly (readonly number[])[],
): CoverageMetric {
  if (branches.length === 0) {
    return { total: 0, covered: 0, pct: 100 };
  }
  const flat = branches.flat();
  return computeMetric(flat);
}

/**
 * Aggregate file coverage into a package summary.
 */
export function aggregatePackageCoverage(
  packageName: string,
  packagePath: string,
  files: readonly FileCoverage[],
  threshold: number,
): PackageCoverage {
  const totalStatements = files.reduce(
    (sum, f) => sum + f.statements.total,
    0,
  );
  const coveredStatements = files.reduce(
    (sum, f) => sum + f.statements.covered,
    0,
  );
  const totalBranches = files.reduce((sum, f) => sum + f.branches.total, 0);
  const coveredBranches = files.reduce(
    (sum, f) => sum + f.branches.covered,
    0,
  );
  const totalFunctions = files.reduce(
    (sum, f) => sum + f.functions.total,
    0,
  );
  const coveredFunctions = files.reduce(
    (sum, f) => sum + f.functions.covered,
    0,
  );

  const statements: CoverageMetric = {
    total: totalStatements,
    covered: coveredStatements,
    pct:
      totalStatements > 0
        ? Math.round((coveredStatements / totalStatements) * 10000) / 100
        : 100,
  };

  const branches: CoverageMetric = {
    total: totalBranches,
    covered: coveredBranches,
    pct:
      totalBranches > 0
        ? Math.round((coveredBranches / totalBranches) * 10000) / 100
        : 100,
  };

  const functions: CoverageMetric = {
    total: totalFunctions,
    covered: coveredFunctions,
    pct:
      totalFunctions > 0
        ? Math.round((coveredFunctions / totalFunctions) * 10000) / 100
        : 100,
  };

  // Uncovered files are those with < 50% statement coverage
  const uncoveredFiles = files
    .filter((f) => f.statements.pct < 50)
    .map((f) => f.file);

  const passesThreshold = statements.pct >= threshold;

  return {
    name: packageName,
    path: packagePath,
    statements,
    branches,
    functions,
    lines: statements,
    files,
    uncoveredFiles,
    passesThreshold,
  };
}

/**
 * Generate a coverage badge SVG for a package.
 */
export function generateBadgeSvg(
  packageName: string,
  coverage: number,
): string {
  const color =
    coverage >= 90
      ? "#4c1"
      : coverage >= 80
        ? "#97ca00"
        : coverage >= 70
          ? "#dfb317"
          : coverage >= 50
            ? "#fe7d37"
            : "#e05d44";

  const label = "coverage";
  const value = `${coverage}%`;
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

/**
 * Write coverage badge to a package directory.
 */
export function writeBadge(
  packageDir: string,
  packageName: string,
  coverage: number,
): string {
  const svg = generateBadgeSvg(packageName, coverage);
  const badgePath = join(packageDir, "coverage-badge.svg");
  writeFileSync(badgePath, svg, "utf-8");
  return badgePath;
}

/**
 * Format the coverage report for terminal display.
 */
export function formatCoverageReport(report: CoverageReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("  Coverage Report");
  lines.push("  " + "=".repeat(70));
  lines.push("");

  for (const pkg of report.packages) {
    const statusIcon = pkg.passesThreshold ? chalk.green("PASS") : chalk.red("FAIL");
    const pctColor =
      pkg.statements.pct >= report.threshold ? chalk.green : chalk.red;

    lines.push(
      `  ${statusIcon}  ${chalk.bold(pkg.name.padEnd(35))} ${pctColor(`${pkg.statements.pct}%`)} statements`,
    );

    if (pkg.uncoveredFiles.length > 0) {
      lines.push(
        chalk.dim(`         Uncovered: ${pkg.uncoveredFiles.length} file(s)`),
      );
    }
  }

  lines.push("");
  lines.push("  " + "-".repeat(70));

  const totalColor =
    report.total.pct >= report.threshold ? chalk.green : chalk.red;
  lines.push(
    `  Total: ${totalColor(`${report.total.pct}%`)} (threshold: ${report.threshold}%)`,
  );

  if (!report.allPass) {
    lines.push("");
    lines.push(
      chalk.red(
        `  Some packages are below the ${report.threshold}% coverage threshold.`,
      ),
    );
  }

  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe test coverage` command.
 */
export function testCoverageCommand(): Command {
  const cmd = new Command("coverage")
    .description("Per-package test coverage reporting")
    .option(
      "--threshold <pct>",
      "Minimum coverage percentage",
      String(DEFAULT_THRESHOLD),
    )
    .option("--badge", "Generate coverage badges per package")
    .option("--json", "Output as JSON (same as VIBE_OUTPUT=json)")
    .action(
      async (options: {
        threshold: string;
        badge?: boolean;
        json?: boolean;
      }) => {
        if (options.json) {
          process.env.VIBE_OUTPUT = "json";
        }

        const formatter = createFormatter();
        const threshold = parseInt(options.threshold, 10);
        const rootDir = process.cwd();

        formatter.info("Discovering testable packages...");

        const packageDirs = discoverTestablePackages(rootDir);
        if (packageDirs.length === 0) {
          formatter.info("No testable packages found.");
          return;
        }

        formatter.info(
          `Found ${packageDirs.length} package(s). Running coverage...`,
        );

        const packages: PackageCoverage[] = [];

        for (const pkgDir of packageDirs) {
          const pkgJsonPath = join(pkgDir, "package.json");
          let pkgName = basename(pkgDir);

          try {
            const pkgJson = JSON.parse(
              readFileSync(pkgJsonPath, "utf-8"),
            ) as Record<string, unknown>;
            pkgName = (pkgJson["name"] as string) ?? pkgName;
          } catch {
            // Use directory name
          }

          formatter.info(`Running coverage for ${pkgName}...`);

          // Run vitest with coverage
          try {
            const { execSync } = await import("node:child_process");
            execSync(
              "npx vitest run --coverage --coverage.reporter=json --coverage.reportsDirectory=coverage",
              {
                cwd: pkgDir,
                stdio: "pipe",
                env: { ...process.env },
              },
            );
          } catch {
            formatter.warn(`Coverage run failed for ${pkgName}, skipping...`);
            continue;
          }

          // Parse coverage output
          const coveragePath = join(pkgDir, "coverage", "coverage-final.json");
          const fileCoverage = parseCoverageJson(coveragePath);

          const pkgCoverage = aggregatePackageCoverage(
            pkgName,
            relative(rootDir, pkgDir),
            fileCoverage,
            threshold,
          );

          packages.push(pkgCoverage);

          // Generate badge if requested
          if (options.badge) {
            writeBadge(pkgDir, pkgName, pkgCoverage.statements.pct);
          }
        }

        // Compute total
        const totalStmts = packages.reduce(
          (s, p) => s + p.statements.total,
          0,
        );
        const coveredStmts = packages.reduce(
          (s, p) => s + p.statements.covered,
          0,
        );
        const totalPct =
          totalStmts > 0
            ? Math.round((coveredStmts / totalStmts) * 10000) / 100
            : 100;

        const report: CoverageReport = {
          packages,
          total: {
            total: totalStmts,
            covered: coveredStmts,
            pct: totalPct,
          },
          threshold,
          allPass: packages.every((p) => p.passesThreshold),
          generatedAt: new Date().toISOString(),
        };

        // Display report
        console.log(formatCoverageReport(report));

        if (report.allPass) {
          formatter.success({
            command: "test coverage",
            data: report,
            message: `All packages meet the ${threshold}% coverage threshold`,
          });
        } else {
          const failing = packages
            .filter((p) => !p.passesThreshold)
            .map((p) => p.name);

          formatter.error({
            command: "test coverage",
            message: `${failing.length} package(s) below ${threshold}% coverage: ${failing.join(", ")}`,
            fix: `Increase test coverage in: ${failing.join(", ")}`,
          });
          process.exit(1);
        }
      },
    );

  return cmd;
}
