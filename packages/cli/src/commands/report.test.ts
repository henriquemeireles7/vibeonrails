import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  collectReportData,
  generateReportMarkdown,
  buildWeeklyReport,
  saveReport,
} from "./report.js";
import type {
  ReportDataSources,
  FinanceSnapshot,
  AnalyticsSnapshot,
  SupportSnapshot,
  ContentSnapshot,
} from "./report.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `vibe-report-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Report Command", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = makeTmpDir();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // Data Collection
  // -----------------------------------------------------------------------

  describe("collectReportData", () => {
    it("returns null for all sources when no data files exist", () => {
      const data = collectReportData(projectRoot);
      expect(data.analytics).toBeNull();
      expect(data.finance).toBeNull();
      expect(data.support).toBeNull();
      expect(data.content).toBeNull();
    });

    it("loads finance snapshot when available", () => {
      const reportsDir = join(projectRoot, ".vibe/reports");
      mkdirSync(reportsDir, { recursive: true });

      const finance: FinanceSnapshot = {
        mrr: 5000,
        mrrChange: 12,
        newCustomers: 8,
        churnedCustomers: 1,
        revenue7d: 1200,
      };
      writeFileSync(
        join(reportsDir, "finance.json"),
        JSON.stringify(finance),
      );

      const data = collectReportData(projectRoot);
      expect(data.finance).toEqual(finance);
    });

    it("loads analytics snapshot when available", () => {
      const reportsDir = join(projectRoot, ".vibe/reports");
      mkdirSync(reportsDir, { recursive: true });

      const analytics: AnalyticsSnapshot = {
        pageviews7d: 10000,
        uniqueVisitors7d: 2500,
        topPages: [{ path: "/", views: 5000 }],
      };
      writeFileSync(
        join(reportsDir, "analytics.json"),
        JSON.stringify(analytics),
      );

      const data = collectReportData(projectRoot);
      expect(data.analytics?.pageviews7d).toBe(10000);
    });
  });

  // -----------------------------------------------------------------------
  // Report Generation
  // -----------------------------------------------------------------------

  describe("generateReportMarkdown", () => {
    it("generates markdown with all sections", () => {
      const sources: ReportDataSources = {
        analytics: {
          pageviews7d: 10000,
          uniqueVisitors7d: 2500,
          topPages: [{ path: "/pricing", views: 3000 }],
        },
        finance: {
          mrr: 5000,
          mrrChange: 12,
          newCustomers: 8,
          churnedCustomers: 1,
          revenue7d: 1200,
        },
        support: {
          ticketsOpened7d: 15,
          ticketsClosed7d: 12,
          avgResponseTimeHours: 2.3,
          openTickets: 8,
        },
        content: {
          postsPublished7d: 3,
          draftsInPipeline: 5,
          topPerformingContent: [{ title: "Launch Post", views: 5000 }],
        },
      };

      const md = generateReportMarkdown(sources, "My SaaS");

      expect(md).toContain("# Weekly Report: My SaaS");
      expect(md).toContain("## Finance");
      expect(md).toContain("$5,000.00");
      expect(md).toContain("+12%");
      expect(md).toContain("## Analytics");
      expect(md).toContain("10,000");
      expect(md).toContain("## Support");
      expect(md).toContain("2.3h");
      expect(md).toContain("## Content");
      expect(md).toContain("Launch Post");
    });

    it("shows placeholder text for missing data sources", () => {
      const sources: ReportDataSources = {
        analytics: null,
        finance: null,
        support: null,
        content: null,
      };

      const md = generateReportMarkdown(sources, "Bare Project");

      expect(md).toContain("No finance data available");
      expect(md).toContain("No analytics data available");
      expect(md).toContain("No support data available");
      expect(md).toContain("No content data available");
    });

    it("includes generation date", () => {
      const sources: ReportDataSources = {
        analytics: null,
        finance: null,
        support: null,
        content: null,
      };

      const md = generateReportMarkdown(sources, "Test");
      const today = new Date().toISOString().split("T")[0]!;
      expect(md).toContain(today);
    });
  });

  // -----------------------------------------------------------------------
  // Build Weekly Report
  // -----------------------------------------------------------------------

  describe("buildWeeklyReport", () => {
    it("builds a complete report object", () => {
      const report = buildWeeklyReport(projectRoot, "Test Project");

      expect(report.generatedAt).toBeDefined();
      expect(report.weekOf).toBeDefined();
      expect(report.markdown).toContain("# Weekly Report: Test Project");
      expect(report.sources).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Save Report
  // -----------------------------------------------------------------------

  describe("saveReport", () => {
    it("saves report markdown to disk", () => {
      const report = buildWeeklyReport(projectRoot, "Test");
      const filePath = saveReport(projectRoot, report);

      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf-8");
      expect(content).toContain("# Weekly Report: Test");
    });
  });
});
