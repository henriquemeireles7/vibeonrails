/**
 * Vibe Audit Command
 *
 * `vibe audit` — Run comprehensive codebase audit (172 checks from vibeaudit.md).
 * Scans for security issues, performance problems, code quality, and more.
 */

import { Command } from "commander";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";
import {
  buildAuditContext,
  runAuditChecks,
  buildReport,
  getChecks,
  filterChecks,
  ALL_CATEGORIES,
} from "../audit/index.js";
import type { AuditCategory, Severity, AuditReport, AuditCheckResult } from "../audit/types.js";

// ---------------------------------------------------------------------------
// Severity display
// ---------------------------------------------------------------------------

const SEVERITY_ICON: Record<Severity, string> = {
  critical: chalk.red("CRIT"),
  high: chalk.yellow("HIGH"),
  medium: chalk.blue("MED "),
  low: chalk.dim("LOW "),
};

const STATUS_ICON: Record<string, string> = {
  pass: chalk.green("PASS"),
  fail: chalk.red("FAIL"),
  warn: chalk.yellow("WARN"),
  skip: chalk.dim("SKIP"),
};

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function printReport(report: AuditReport): void {
  const { totalChecks, passed, failed, warned, skipped, score, results } =
    report;

  console.log();
  console.log(
    chalk.bold("  Vibe Audit Report"),
  );
  console.log(chalk.dim(`  ${report.timestamp}`));
  console.log();

  // Score
  const scoreColor =
    score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
  console.log(
    `  Score: ${scoreColor.bold(`${score}/100`)}`,
  );
  console.log(
    `  ${chalk.green(`${passed} passed`)} | ${chalk.red(`${failed} failed`)} | ${chalk.yellow(`${warned} warnings`)} | ${chalk.dim(`${skipped} skipped`)} | ${totalChecks} total`,
  );
  console.log();

  // Failed checks (most important)
  const failures = results.filter((r) => r.status === "fail");
  if (failures.length > 0) {
    console.log(chalk.red.bold("  Failed Checks:"));
    console.log();
    for (const result of sortBySeverity(failures)) {
      printCheckResult(result);
    }
  }

  // Warnings
  const warnings = results.filter((r) => r.status === "warn");
  if (warnings.length > 0) {
    console.log(chalk.yellow.bold("  Warnings:"));
    console.log();
    for (const result of warnings) {
      printCheckResult(result);
    }
  }

  // Summary by category
  console.log(chalk.bold("  Summary by Category:"));
  console.log();
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.status === "pass").length;
    const catFailed = catResults.filter((r) => r.status === "fail").length;
    const catSkipped = catResults.filter((r) => r.status === "skip").length;
    const total = catResults.length;
    const pct = total - catSkipped > 0
      ? Math.round((catPassed / (total - catSkipped)) * 100)
      : 100;
    const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
    console.log(
      `  ${cat.padEnd(18)} ${color(`${pct}%`.padStart(4))}  (${catPassed}/${total - catSkipped} passed, ${catSkipped} manual)`,
    );
  }
  console.log();
}

function printCheckResult(result: AuditCheckResult): void {
  const icon = STATUS_ICON[result.status] ?? "????";
  const sev = SEVERITY_ICON[result.severity];
  console.log(`  ${icon} ${sev} [${result.id}] ${result.name}`);
  if (result.findings.length > 0 && result.status !== "skip") {
    for (const f of result.findings.slice(0, 5)) {
      const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : "";
      console.log(chalk.dim(`       ${loc ? `${loc} — ` : ""}${f.message}`));
      if (f.suggestion) {
        console.log(chalk.dim(`       Fix: ${f.suggestion}`));
      }
    }
    if (result.findings.length > 5) {
      console.log(
        chalk.dim(`       ... and ${result.findings.length - 5} more`),
      );
    }
  }
  console.log();
}

function sortBySeverity(results: AuditCheckResult[]): AuditCheckResult[] {
  const order: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...results].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function auditCommand(): Command {
  return new Command("audit")
    .description(
      "Run comprehensive codebase audit (172 checks from vibeaudit.md)",
    )
    .option("--top30", "Only run the Top 30 non-negotiable checks")
    .option("--critical", "Only run CRITICAL severity checks")
    .option(
      "--category <categories>",
      "Filter by category (comma-separated)",
    )
    .option(
      "--severity <severities>",
      "Filter by severity (comma-separated)",
    )
    .option("--id <ids>", "Run specific check IDs (comma-separated)")
    .option("--exclude <ids>", "Exclude specific check IDs (comma-separated)")
    .option("--automatable", "Only run automatable checks (skip manual)")
    .option("--json", "Output as JSON")
    .option("--score", "Only show the score (0-100)")
    .option(
      "--ci",
      "CI mode: exit code 1 if any critical checks fail",
    )
    .action(
      async (options: {
        top30?: boolean;
        critical?: boolean;
        category?: string;
        severity?: string;
        id?: string;
        exclude?: string;
        automatable?: boolean;
        json?: boolean;
        score?: boolean;
        ci?: boolean;
      }) => {
        const fmt = createFormatter();
        const projectRoot = process.cwd();

        fmt.info(chalk.dim("Scanning project..."));

        // Build context
        const ctx = await buildAuditContext(projectRoot);

        // Filter checks
        const checks = filterChecks({
          top30Only: options.top30,
          categories: options.category
            ? (options.category.split(",") as AuditCategory[])
            : undefined,
          severities: options.critical
            ? (["critical"] as Severity[])
            : options.severity
              ? (options.severity.split(",") as Severity[])
              : undefined,
          ids: options.id ? options.id.split(",") : undefined,
          excludeIds: options.exclude
            ? options.exclude.split(",")
            : undefined,
          automatableOnly: options.automatable,
        });

        fmt.info(
          chalk.dim(`Running ${checks.length} checks...`),
        );

        // Run checks
        const results = await runAuditChecks(checks, ctx);
        const report = buildReport(results, projectRoot);

        // Output
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        if (options.score) {
          console.log(report.score);
          return;
        }

        printReport(report);

        // CI exit code
        if (options.ci) {
          const hasCriticalFailure = results.some(
            (r) => r.status === "fail" && r.severity === "critical",
          );
          if (hasCriticalFailure) {
            process.exitCode = 1;
          }
        }
      },
    );
}
