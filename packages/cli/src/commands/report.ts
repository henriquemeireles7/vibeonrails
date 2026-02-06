/**
 * AI Weekly Report
 *
 * `vibe report` — AI-generated weekly business report.
 * Reads: analytics, finance, support, marketing data.
 * Generates 1-page markdown summary.
 * Companion posts to #general every Monday.
 * `vibe report --weekly` runs on demand.
 */

import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportDataSources {
  analytics: AnalyticsSnapshot | null;
  finance: FinanceSnapshot | null;
  support: SupportSnapshot | null;
  content: ContentSnapshot | null;
}

export interface AnalyticsSnapshot {
  pageviews7d: number;
  uniqueVisitors7d: number;
  topPages: Array<{ path: string; views: number }>;
}

export interface FinanceSnapshot {
  mrr: number;
  mrrChange: number;
  newCustomers: number;
  churnedCustomers: number;
  revenue7d: number;
}

export interface SupportSnapshot {
  ticketsOpened7d: number;
  ticketsClosed7d: number;
  avgResponseTimeHours: number;
  openTickets: number;
}

export interface ContentSnapshot {
  postsPublished7d: number;
  draftsInPipeline: number;
  topPerformingContent: Array<{ title: string; views: number }>;
}

export interface WeeklyReport {
  generatedAt: string;
  weekOf: string;
  markdown: string;
  sources: ReportDataSources;
}

// ---------------------------------------------------------------------------
// Data Collection
// ---------------------------------------------------------------------------

/** Attempt to load a data snapshot from the .vibe/reports/ cache. */
function loadSnapshot<T>(projectRoot: string, name: string): T | null {
  const snapshotPath = join(projectRoot, `.vibe/reports/${name}.json`);
  if (!existsSync(snapshotPath)) return null;

  try {
    return JSON.parse(readFileSync(snapshotPath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Collect all available data sources for the report. */
export function collectReportData(projectRoot: string): ReportDataSources {
  return {
    analytics: loadSnapshot<AnalyticsSnapshot>(projectRoot, "analytics"),
    finance: loadSnapshot<FinanceSnapshot>(projectRoot, "finance"),
    support: loadSnapshot<SupportSnapshot>(projectRoot, "support"),
    content: loadSnapshot<ContentSnapshot>(projectRoot, "content"),
  };
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function changeIndicator(change: number): string {
  if (change > 0) return `+${change}%`;
  if (change < 0) return `${change}%`;
  return "0%";
}

/** Generate a weekly report markdown from collected data. */
export function generateReportMarkdown(
  sources: ReportDataSources,
  projectName: string,
): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const lines: string[] = [];

  lines.push(`# Weekly Report: ${projectName}`);
  lines.push("");
  lines.push(
    `**Week of ${weekStart.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}**`,
  );
  lines.push("");

  // Finance section
  lines.push("## Finance");
  lines.push("");
  if (sources.finance) {
    const f = sources.finance;
    lines.push(`- **MRR**: ${formatCurrency(f.mrr)} (${changeIndicator(f.mrrChange)})`);
    lines.push(`- **Revenue (7d)**: ${formatCurrency(f.revenue7d)}`);
    lines.push(`- **New Customers**: ${f.newCustomers}`);
    lines.push(`- **Churned**: ${f.churnedCustomers}`);
  } else {
    lines.push("_No finance data available. Install @vibeonrails/finance._");
  }
  lines.push("");

  // Analytics section
  lines.push("## Analytics");
  lines.push("");
  if (sources.analytics) {
    const a = sources.analytics;
    lines.push(`- **Pageviews (7d)**: ${a.pageviews7d.toLocaleString()}`);
    lines.push(`- **Unique Visitors (7d)**: ${a.uniqueVisitors7d.toLocaleString()}`);
    if (a.topPages.length > 0) {
      lines.push("- **Top Pages**:");
      for (const page of a.topPages.slice(0, 5)) {
        lines.push(`  - ${page.path}: ${page.views.toLocaleString()} views`);
      }
    }
  } else {
    lines.push("_No analytics data available. Analytics module not configured._");
  }
  lines.push("");

  // Support section
  lines.push("## Support");
  lines.push("");
  if (sources.support) {
    const s = sources.support;
    lines.push(`- **Tickets Opened**: ${s.ticketsOpened7d}`);
    lines.push(`- **Tickets Closed**: ${s.ticketsClosed7d}`);
    lines.push(`- **Open Tickets**: ${s.openTickets}`);
    lines.push(`- **Avg Response Time**: ${s.avgResponseTimeHours.toFixed(1)}h`);
  } else {
    lines.push("_No support data available. Install @vibeonrails/support-chat._");
  }
  lines.push("");

  // Content section
  lines.push("## Content");
  lines.push("");
  if (sources.content) {
    const c = sources.content;
    lines.push(`- **Posts Published (7d)**: ${c.postsPublished7d}`);
    lines.push(`- **Drafts in Pipeline**: ${c.draftsInPipeline}`);
    if (c.topPerformingContent.length > 0) {
      lines.push("- **Top Performing**:");
      for (const item of c.topPerformingContent.slice(0, 3)) {
        lines.push(`  - ${item.title}: ${item.views.toLocaleString()} views`);
      }
    }
  } else {
    lines.push("_No content data available. Install @vibeonrails/marketing._");
  }
  lines.push("");

  lines.push("---");
  lines.push(
    `_Generated by Vibe on Rails on ${now.toISOString().split("T")[0]}_`,
  );

  return lines.join("\n");
}

/** Build a complete WeeklyReport object. */
export function buildWeeklyReport(
  projectRoot: string,
  projectName: string,
): WeeklyReport {
  const sources = collectReportData(projectRoot);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  return {
    generatedAt: now.toISOString(),
    weekOf: weekStart.toISOString().split("T")[0]!,
    markdown: generateReportMarkdown(sources, projectName),
    sources,
  };
}

/** Save a report to .vibe/reports/weekly-<date>.md */
export function saveReport(projectRoot: string, report: WeeklyReport): string {
  const reportsDir = join(projectRoot, ".vibe/reports");
  const date = report.generatedAt.split("T")[0];
  const filePath = join(reportsDir, `weekly-${date}.md`);

  // Ensure directory exists
  const { mkdirSync } = require("node:fs") as typeof import("node:fs");
  mkdirSync(reportsDir, { recursive: true });

  writeFileSync(filePath, report.markdown, "utf-8");
  return filePath;
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe report` — Generate AI weekly business report.
 */
export function reportCommand(): Command {
  return new Command("report")
    .description(
      "AI-generated weekly business report — finance, analytics, support, content",
    )
    .option("--weekly", "Generate full weekly report")
    .option("--json", "Output as JSON")
    .option("--save", "Save report to .vibe/reports/")
    .action((options: { weekly?: boolean; json?: boolean; save?: boolean }) => {
      const fmt = createFormatter();
      const projectRoot = process.cwd();

      // Read project name
      let projectName = "Project";
      const pkgPath = join(projectRoot, "package.json");
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
            name?: string;
          };
          projectName = pkg.name ?? "Project";
        } catch {
          // Use default
        }
      }

      const report = buildWeeklyReport(projectRoot, projectName);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log(report.markdown);

      if (options.save) {
        const filePath = saveReport(projectRoot, report);
        fmt.success({
          command: "report",
          data: { file: filePath },
          message: chalk.green(`Report saved to ${chalk.cyan(filePath)}`),
        });
      }
    });
}
