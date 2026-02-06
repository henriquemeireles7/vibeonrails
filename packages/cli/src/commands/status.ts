/**
 * Business Status Dashboard
 *
 * `vibe status` — One-command business dashboard showing:
 * - MRR, active users, pageviews (24h)
 * - Open tickets, content pipeline (drafts/posted)
 * - API health, build status, deploy version
 *
 * Beautiful terminal output + JSON mode.
 */

import { Command } from "commander";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessMetrics {
  mrr: number | null;
  activeUsers: number | null;
  pageviews24h: number | null;
}

export interface ContentPipeline {
  drafts: number;
  posted: number;
  channels: string[];
}

export interface SystemHealth {
  apiHealth: "healthy" | "degraded" | "down" | "unknown";
  buildStatus: "passing" | "failing" | "unknown";
  deployVersion: string | null;
  lastDeploy: string | null;
}

export interface SupportMetrics {
  openTickets: number | null;
  avgResponseTime: string | null;
}

export interface StatusData {
  project: string;
  version: string | null;
  installedModules: string[];
  business: BusinessMetrics;
  content: ContentPipeline;
  system: SystemHealth;
  support: SupportMetrics;
}

// ---------------------------------------------------------------------------
// Data Collectors
// ---------------------------------------------------------------------------

/** Detect installed VoR modules from package.json. */
export function detectInstalledModules(projectRoot: string): string[] {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {});
    return deps.filter((d) => d.startsWith("@vibeonrails/"));
  } catch {
    return [];
  }
}

/** Get project name from package.json. */
export function getProjectName(projectRoot: string): string {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return "unknown";

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      name?: string;
    };
    return pkg.name ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Get project version from package.json. */
export function getProjectVersion(projectRoot: string): string | null {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

/** Count content drafts and posted items across channels. */
export function getContentPipeline(projectRoot: string): ContentPipeline {
  const channelsDir = join(projectRoot, "content/marketing/channels");
  const result: ContentPipeline = { drafts: 0, posted: 0, channels: [] };

  if (!existsSync(channelsDir)) return result;

  try {
    const channels = readdirSync(channelsDir);
    result.channels = channels;

    for (const channel of channels) {
      const draftsDir = join(channelsDir, channel, "drafts");
      const postedDir = join(channelsDir, channel, "posted");

      if (existsSync(draftsDir)) {
        result.drafts += readdirSync(draftsDir).filter((f) =>
          f.endsWith(".md"),
        ).length;
      }
      if (existsSync(postedDir)) {
        result.posted += readdirSync(postedDir).filter((f) =>
          f.endsWith(".md"),
        ).length;
      }
    }
  } catch {
    // Silently fail if content dir is malformed
  }

  return result;
}

/** Check API health by hitting /health endpoint. */
export function getApiHealth(): SystemHealth["apiHealth"] {
  try {
    const result = execSync("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health", {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    if (result === "200") return "healthy";
    if (result.startsWith("5")) return "degraded";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Get the current git commit or tag as deploy version. */
export function getDeployVersion(projectRoot: string): string | null {
  try {
    const tag = execSync("git describe --tags --abbrev=0 2>/dev/null", {
      cwd: projectRoot,
      encoding: "utf-8",
    }).trim();
    if (tag) return tag;
  } catch {
    // No tags
  }
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: projectRoot,
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

/** Get the last deploy timestamp from .vibe/last-deploy.json. */
export function getLastDeploy(projectRoot: string): string | null {
  const deployPath = join(projectRoot, ".vibe/last-deploy.json");
  if (!existsSync(deployPath)) return null;

  try {
    const data = JSON.parse(readFileSync(deployPath, "utf-8")) as {
      timestamp?: string;
    };
    return data.timestamp ?? null;
  } catch {
    return null;
  }
}

/** Collect all status data. */
export function collectStatusData(projectRoot: string): StatusData {
  return {
    project: getProjectName(projectRoot),
    version: getProjectVersion(projectRoot),
    installedModules: detectInstalledModules(projectRoot),
    business: {
      mrr: null, // Requires finance module runtime data
      activeUsers: null, // Requires analytics module runtime data
      pageviews24h: null, // Requires analytics module runtime data
    },
    content: getContentPipeline(projectRoot),
    system: {
      apiHealth: getApiHealth(),
      buildStatus: "unknown",
      deployVersion: getDeployVersion(projectRoot),
      lastDeploy: getLastDeploy(projectRoot),
    },
    support: {
      openTickets: null, // Requires support module runtime data
      avgResponseTime: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function healthColor(
  health: SystemHealth["apiHealth"],
): (text: string) => string {
  switch (health) {
    case "healthy":
      return chalk.green;
    case "degraded":
      return chalk.yellow;
    case "down":
      return chalk.red;
    default:
      return chalk.dim;
  }
}

function renderStatusLine(label: string, value: string | null | number): string {
  const displayValue =
    value === null || value === undefined ? chalk.dim("--") : String(value);
  return `  ${chalk.bold(label.padEnd(20))} ${displayValue}`;
}

export function renderStatus(data: StatusData): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(
    chalk.bold.cyan(
      `  === ${data.project} ${data.version ? `v${data.version}` : ""} ===`,
    ),
  );
  lines.push("");

  // Business Metrics
  lines.push(chalk.bold.white("  Business"));
  lines.push(chalk.dim("  " + "-".repeat(40)));
  lines.push(
    renderStatusLine(
      "MRR",
      data.business.mrr !== null ? `$${data.business.mrr.toLocaleString()}` : null,
    ),
  );
  lines.push(
    renderStatusLine(
      "Active Users",
      data.business.activeUsers,
    ),
  );
  lines.push(
    renderStatusLine(
      "Pageviews (24h)",
      data.business.pageviews24h,
    ),
  );
  lines.push("");

  // Content Pipeline
  lines.push(chalk.bold.white("  Content"));
  lines.push(chalk.dim("  " + "-".repeat(40)));
  lines.push(renderStatusLine("Drafts", data.content.drafts));
  lines.push(renderStatusLine("Posted", data.content.posted));
  if (data.content.channels.length > 0) {
    lines.push(
      renderStatusLine("Channels", data.content.channels.join(", ")),
    );
  }
  lines.push("");

  // System Health
  lines.push(chalk.bold.white("  System"));
  lines.push(chalk.dim("  " + "-".repeat(40)));
  const hc = healthColor(data.system.apiHealth);
  lines.push(
    renderStatusLine("API Health", hc(data.system.apiHealth)),
  );
  lines.push(
    renderStatusLine("Build Status", data.system.buildStatus),
  );
  lines.push(
    renderStatusLine("Deploy Version", data.system.deployVersion),
  );
  lines.push(
    renderStatusLine("Last Deploy", data.system.lastDeploy),
  );
  lines.push("");

  // Support
  lines.push(chalk.bold.white("  Support"));
  lines.push(chalk.dim("  " + "-".repeat(40)));
  lines.push(
    renderStatusLine("Open Tickets", data.support.openTickets),
  );
  lines.push(
    renderStatusLine("Avg Response", data.support.avgResponseTime),
  );
  lines.push("");

  // Installed Modules
  if (data.installedModules.length > 0) {
    lines.push(chalk.bold.white("  Installed Modules"));
    lines.push(chalk.dim("  " + "-".repeat(40)));
    for (const mod of data.installedModules) {
      lines.push(`  ${chalk.cyan(mod)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe status` — One-command business dashboard.
 */
export function statusCommand(): Command {
  return new Command("status")
    .description("Business dashboard — MRR, users, content, health, support")
    .option("--json", "Output as JSON")
    .action((options: { json?: boolean }) => {
      const fmt = createFormatter();
      const projectRoot = process.cwd();
      const data = collectStatusData(projectRoot);

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      console.log(renderStatus(data));

      if (data.installedModules.length === 0) {
        fmt.info(
          chalk.dim(
            "No VoR modules detected. Run " +
              chalk.cyan("vibe add <module>") +
              " to get started.",
          ),
        );
      }
    });
}
