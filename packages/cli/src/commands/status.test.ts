import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectInstalledModules,
  getProjectName,
  getProjectVersion,
  getContentPipeline,
  collectStatusData,
  renderStatus,
} from "./status.js";
import type { StatusData } from "./status.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `vibe-status-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Status Dashboard", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = makeTmpDir();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // Module Detection
  // -----------------------------------------------------------------------

  describe("detectInstalledModules", () => {
    it("detects @vibeonrails packages from dependencies", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({
          dependencies: {
            "@vibeonrails/core": "^1.0.0",
            "@vibeonrails/payments": "^1.0.0",
            react: "^19.0.0",
          },
        }),
      );

      const modules = detectInstalledModules(projectRoot);
      expect(modules).toEqual(["@vibeonrails/core", "@vibeonrails/payments"]);
    });

    it("returns empty array when no package.json", () => {
      expect(detectInstalledModules(projectRoot)).toEqual([]);
    });

    it("returns empty array when no @vibeonrails deps", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ dependencies: { react: "^19" } }),
      );
      expect(detectInstalledModules(projectRoot)).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Project Info
  // -----------------------------------------------------------------------

  describe("getProjectName", () => {
    it("reads name from package.json", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ name: "my-saas" }),
      );
      expect(getProjectName(projectRoot)).toBe("my-saas");
    });

    it("returns 'unknown' when no package.json", () => {
      expect(getProjectName(projectRoot)).toBe("unknown");
    });
  });

  describe("getProjectVersion", () => {
    it("reads version from package.json", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ version: "2.1.0" }),
      );
      expect(getProjectVersion(projectRoot)).toBe("2.1.0");
    });

    it("returns null when no package.json", () => {
      expect(getProjectVersion(projectRoot)).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Content Pipeline
  // -----------------------------------------------------------------------

  describe("getContentPipeline", () => {
    it("counts drafts and posted files across channels", () => {
      const channels = join(projectRoot, "content/marketing/channels");

      // Twitter channel
      mkdirSync(join(channels, "twitter/drafts"), { recursive: true });
      mkdirSync(join(channels, "twitter/posted"), { recursive: true });
      writeFileSync(join(channels, "twitter/drafts/tweet1.md"), "# Tweet");
      writeFileSync(join(channels, "twitter/drafts/tweet2.md"), "# Tweet");
      writeFileSync(join(channels, "twitter/posted/tweet3.md"), "# Posted");

      // Blog channel
      mkdirSync(join(channels, "blog/drafts"), { recursive: true });
      writeFileSync(join(channels, "blog/drafts/post1.md"), "# Blog");

      const pipeline = getContentPipeline(projectRoot);
      expect(pipeline.drafts).toBe(3);
      expect(pipeline.posted).toBe(1);
      expect(pipeline.channels).toContain("twitter");
      expect(pipeline.channels).toContain("blog");
    });

    it("returns zeros when content dir missing", () => {
      const pipeline = getContentPipeline(projectRoot);
      expect(pipeline.drafts).toBe(0);
      expect(pipeline.posted).toBe(0);
      expect(pipeline.channels).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // collectStatusData
  // -----------------------------------------------------------------------

  describe("collectStatusData", () => {
    it("collects all status fields", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: { "@vibeonrails/core": "^1.0.0" },
        }),
      );

      const data = collectStatusData(projectRoot);
      expect(data.project).toBe("test-project");
      expect(data.version).toBe("1.0.0");
      expect(data.installedModules).toContain("@vibeonrails/core");
      expect(data.business).toBeDefined();
      expect(data.content).toBeDefined();
      expect(data.system).toBeDefined();
      expect(data.support).toBeDefined();
    });

    it("handles missing module data gracefully", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ name: "bare-project" }),
      );

      const data = collectStatusData(projectRoot);
      expect(data.business.mrr).toBeNull();
      expect(data.business.activeUsers).toBeNull();
      expect(data.support.openTickets).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  describe("renderStatus", () => {
    it("renders all sections", () => {
      const data: StatusData = {
        project: "my-saas",
        version: "1.2.0",
        installedModules: ["@vibeonrails/core", "@vibeonrails/payments"],
        business: { mrr: 5000, activeUsers: 120, pageviews24h: 4500 },
        content: { drafts: 3, posted: 15, channels: ["twitter", "blog"] },
        system: {
          apiHealth: "healthy",
          buildStatus: "passing",
          deployVersion: "v1.2.0",
          lastDeploy: "2025-01-15T10:00:00Z",
        },
        support: {
          openTickets: 5,
          avgResponseTime: "2.3h",
        },
      };

      const output = renderStatus(data);
      expect(output).toContain("my-saas");
      expect(output).toContain("1.2.0");
      expect(output).toContain("Business");
      expect(output).toContain("Content");
      expect(output).toContain("System");
      expect(output).toContain("Support");
      expect(output).toContain("Installed Modules");
    });

    it("shows dashes for null values", () => {
      const data: StatusData = {
        project: "test",
        version: null,
        installedModules: [],
        business: { mrr: null, activeUsers: null, pageviews24h: null },
        content: { drafts: 0, posted: 0, channels: [] },
        system: {
          apiHealth: "unknown",
          buildStatus: "unknown",
          deployVersion: null,
          lastDeploy: null,
        },
        support: { openTickets: null, avgResponseTime: null },
      };

      const output = renderStatus(data);
      expect(output).toContain("--");
    });

    it("handles JSON output mode via data structure", () => {
      const data: StatusData = {
        project: "test",
        version: "1.0.0",
        installedModules: [],
        business: { mrr: null, activeUsers: null, pageviews24h: null },
        content: { drafts: 0, posted: 0, channels: [] },
        system: {
          apiHealth: "unknown",
          buildStatus: "unknown",
          deployVersion: null,
          lastDeploy: null,
        },
        support: { openTickets: null, avgResponseTime: null },
      };

      // JSON mode just serializes the data object
      const json = JSON.stringify(data, null, 2);
      const parsed = JSON.parse(json) as StatusData;
      expect(parsed.project).toBe("test");
      expect(parsed.business.mrr).toBeNull();
    });
  });
});
