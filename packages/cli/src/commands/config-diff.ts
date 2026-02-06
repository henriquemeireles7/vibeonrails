/**
 * Config Diff
 *
 * `vibe config diff` — shows vibe.config.ts changes since last deploy.
 * Highlights security-relevant changes. Prevents accidental config changes
 * reaching production.
 */

import { Command } from "commander";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfigChange {
  file: string;
  diff: string;
  securityRelevant: boolean;
  securityDetails: string[];
}

export interface DeployMarker {
  commit: string;
  timestamp: string;
  version?: string;
}

// ---------------------------------------------------------------------------
// Security Patterns
// ---------------------------------------------------------------------------

/** Patterns in config diffs that indicate security-relevant changes. */
const SECURITY_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /cors/i, description: "CORS configuration changed" },
  { pattern: /rateLimit/i, description: "Rate limiting configuration changed" },
  { pattern: /csrf/i, description: "CSRF protection configuration changed" },
  { pattern: /auth/i, description: "Authentication configuration changed" },
  { pattern: /secret/i, description: "Secret-related configuration changed" },
  { pattern: /session/i, description: "Session configuration changed" },
  { pattern: /cookie/i, description: "Cookie configuration changed" },
  { pattern: /jwt/i, description: "JWT configuration changed" },
  { pattern: /encrypt/i, description: "Encryption configuration changed" },
  { pattern: /password/i, description: "Password policy configuration changed" },
  { pattern: /oauth/i, description: "OAuth configuration changed" },
  { pattern: /webhook/i, description: "Webhook configuration changed" },
  { pattern: /apiKey/i, description: "API key configuration changed" },
  { pattern: /allowedOrigins/i, description: "Allowed origins changed" },
  { pattern: /trustedDomains/i, description: "Trusted domains changed" },
];

// ---------------------------------------------------------------------------
// Config files to watch
// ---------------------------------------------------------------------------

const CONFIG_FILES = [
  "vibe.config.ts",
  "vibe.config.js",
  "config/security.ts",
  "config/database.ts",
  "config/auth.ts",
  ".env.production",
];

// ---------------------------------------------------------------------------
// Deploy Marker
// ---------------------------------------------------------------------------

const DEPLOY_MARKER_FILE = ".vibe/last-deploy.json";

export function getDeployMarkerPath(projectRoot: string): string {
  return join(projectRoot, DEPLOY_MARKER_FILE);
}

export function loadDeployMarker(
  projectRoot: string,
): DeployMarker | undefined {
  const markerPath = getDeployMarkerPath(projectRoot);
  if (!existsSync(markerPath)) return undefined;

  try {
    const raw = execSync(`cat "${markerPath}"`, { encoding: "utf-8" });
    return JSON.parse(raw) as DeployMarker;
  } catch {
    return undefined;
  }
}

export function saveDeployMarker(
  projectRoot: string,
  marker: DeployMarker,
): void {
  const markerPath = getDeployMarkerPath(projectRoot);
  const dir = join(projectRoot, ".vibe");
  if (!existsSync(dir)) {
    execSync(`mkdir -p "${dir}"`);
  }
  const content = JSON.stringify(marker, null, 2);
  execSync(`echo '${content}' > "${markerPath}"`);
}

// ---------------------------------------------------------------------------
// Diff Logic
// ---------------------------------------------------------------------------

/** Get the diff for a config file since a specific commit. */
export function getConfigDiff(
  file: string,
  sinceCommit: string,
  cwd: string,
): string {
  try {
    return execSync(`git diff ${sinceCommit}..HEAD -- "${file}"`, {
      cwd,
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

/** Check if a diff contains security-relevant changes. */
export function detectSecurityChanges(diff: string): string[] {
  if (!diff) return [];

  const findings: string[] = [];
  for (const { pattern, description } of SECURITY_PATTERNS) {
    if (pattern.test(diff)) {
      findings.push(description);
    }
  }
  return findings;
}

/** Analyze all config files for changes since last deploy. */
export function analyzeConfigChanges(
  projectRoot: string,
  sinceCommit: string,
): ConfigChange[] {
  const changes: ConfigChange[] = [];

  for (const file of CONFIG_FILES) {
    const filePath = join(projectRoot, file);
    if (!existsSync(filePath)) continue;

    const diff = getConfigDiff(file, sinceCommit, projectRoot);
    if (!diff) continue;

    const securityDetails = detectSecurityChanges(diff);
    changes.push({
      file,
      diff,
      securityRelevant: securityDetails.length > 0,
      securityDetails,
    });
  }

  return changes;
}

/** Get the latest git commit hash. */
export function getLatestCommit(cwd: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

export function formatConfigChange(change: ConfigChange): string {
  const lines: string[] = [];

  lines.push(
    `  ${chalk.bold(change.file)}${change.securityRelevant ? chalk.red(" [SECURITY]") : ""}`,
  );

  if (change.securityRelevant) {
    for (const detail of change.securityDetails) {
      lines.push(`    ${chalk.red("!")} ${chalk.yellow(detail)}`);
    }
  }

  // Show abbreviated diff
  const diffLines = change.diff.split("\n");
  for (const line of diffLines.slice(0, 30)) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      lines.push(`    ${chalk.green(line)}`);
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      lines.push(`    ${chalk.red(line)}`);
    } else if (line.startsWith("@@")) {
      lines.push(`    ${chalk.cyan(line)}`);
    }
  }

  if (diffLines.length > 30) {
    lines.push(chalk.dim(`    ... ${diffLines.length - 30} more lines`));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe config` — Configuration management subcommands.
 */
export function configCommand(): Command {
  const config = new Command("config").description(
    "Configuration management",
  );

  config
    .command("diff")
    .description("Show config changes since last deploy")
    .option("--since <commit>", "Compare against a specific commit")
    .option("--json", "Output as JSON")
    .option(
      "--mark-deployed",
      "Mark current state as the deploy baseline",
    )
    .action(
      (options: {
        since?: string;
        json?: boolean;
        markDeployed?: boolean;
      }) => {
        const fmt = createFormatter();
        const projectRoot = process.cwd();

        // Mark deployed
        if (options.markDeployed) {
          const commit = getLatestCommit(projectRoot);
          if (!commit) {
            fmt.error({
              command: "config diff",
              message: "Cannot determine current commit.",
              fix: "Ensure you are in a git repository.",
            });
            process.exit(1);
          }
          saveDeployMarker(projectRoot, {
            commit,
            timestamp: new Date().toISOString(),
          });
          fmt.success({
            command: "config diff",
            data: { commit },
            message: chalk.green(
              `Deploy marker set at ${chalk.yellow(commit.slice(0, 8))}`,
            ),
          });
          return;
        }

        // Determine baseline commit
        let sinceCommit = options.since;
        if (!sinceCommit) {
          const marker = loadDeployMarker(projectRoot);
          if (marker) {
            sinceCommit = marker.commit;
          } else {
            // Default: compare against last 10 commits
            sinceCommit = "HEAD~10";
          }
        }

        const changes = analyzeConfigChanges(projectRoot, sinceCommit);

        if (changes.length === 0) {
          fmt.info("No config changes since last deploy baseline.");
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(changes, null, 2));
          return;
        }

        const securityCount = changes.filter((c) => c.securityRelevant).length;

        fmt.info(
          chalk.bold(
            `\nConfig changes since ${chalk.yellow(String(sinceCommit).slice(0, 8))}:\n`,
          ),
        );

        if (securityCount > 0) {
          console.log(
            chalk.red.bold(
              `  WARNING: ${securityCount} security-relevant change(s) detected!\n`,
            ),
          );
        }

        for (const change of changes) {
          console.log(formatConfigChange(change));
          console.log();
        }

        fmt.info(
          chalk.dim(
            `Run ${chalk.cyan("vibe config diff --mark-deployed")} to update the baseline.`,
          ),
        );
      },
    );

  return config;
}
