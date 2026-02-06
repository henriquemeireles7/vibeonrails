/**
 * Companion CLI — Tests
 *
 * Tests for companion status, config, and logs commands.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  getCompanionStatus,
  getCompanionConfig,
  getCompanionLogs,
  formatStatus,
} from "./cli.js";
import { saveConfig } from "./setup.js";
import type { CompanionStatus } from "./types.js";

describe("getCompanionStatus", () => {
  const testDir = join(tmpdir(), "vibe-companion-cli-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("should return not-configured when no config exists", async () => {
    const status = await getCompanionStatus({ projectRoot: testDir });
    expect(status.connected).toBe(false);
    expect(status.name).toBe("not-configured");
    expect(status.skills).toEqual([]);
  });

  it("should return disconnected when OpenClaw is unreachable", async () => {
    saveConfig(testDir, {
      platform: "discord",
      openclawUrl: "http://localhost:99999",
      name: "test-bot",
      personalityPath: "content/brand/agent.md",
      installedSkills: ["vibe-project"],
      channelMapping: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const status = await getCompanionStatus({ projectRoot: testDir });
    expect(status.connected).toBe(false);
    expect(status.name).toBe("test-bot");
    expect(status.skills).toEqual(["vibe-project"]);
  });
});

describe("getCompanionConfig", () => {
  const testDir = join(tmpdir(), "vibe-companion-cfg-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return not configured when no config exists", () => {
    const result = getCompanionConfig(testDir);
    expect(result.configured).toBe(false);
    expect(result.config).toBeNull();
  });

  it("should return configured with config data", () => {
    saveConfig(testDir, {
      platform: "discord",
      openclawUrl: "http://localhost:3100",
      name: "test-bot",
      personalityPath: "content/brand/agent.md",
      installedSkills: ["vibe-project", "vibe-marketing"],
      channelMapping: { general: "general" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const result = getCompanionConfig(testDir);
    expect(result.configured).toBe(true);
    expect(result.config?.name).toBe("test-bot");
    expect(result.personalityExists).toBe(false);
  });

  it("should detect personality file existence", () => {
    saveConfig(testDir, {
      platform: "discord",
      openclawUrl: "http://localhost:3100",
      name: "test-bot",
      personalityPath: "content/brand/agent.md",
      installedSkills: [],
      channelMapping: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    // Create the personality file
    mkdirSync(join(testDir, "content", "brand"), { recursive: true });
    writeFileSync(
      join(testDir, "content", "brand", "agent.md"),
      "# Personality",
    );

    const result = getCompanionConfig(testDir);
    expect(result.personalityExists).toBe(true);
  });
});

describe("getCompanionLogs", () => {
  const testDir = join(tmpdir(), "vibe-companion-logs-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return error when not configured", async () => {
    const result = await getCompanionLogs({ projectRoot: testDir });
    expect(result.logs).toEqual([]);
    expect(result.error).toContain("not configured");
  });
});

describe("formatStatus", () => {
  it("should format connected status", () => {
    const status: CompanionStatus = {
      connected: true,
      name: "swift-falcon",
      platform: "discord",
      openclawUrl: "http://localhost:3100",
      skills: ["vibe-project", "vibe-marketing"],
      uptime: 3660,
      lastActivity: "2026-02-06T10:00:00Z",
    };

    const output = formatStatus(status);
    expect(output).toContain("swift-falcon");
    expect(output).toContain("Connected");
    expect(output).toContain("1h 1m");
    expect(output).toContain("vibe-project, vibe-marketing");
  });

  it("should format disconnected status", () => {
    const status: CompanionStatus = {
      connected: false,
      name: "test-bot",
      platform: "discord",
      openclawUrl: "http://localhost:3100",
      skills: [],
      uptime: 0,
      lastActivity: null,
    };

    const output = formatStatus(status);
    expect(output).toContain("Disconnected");
    expect(output).not.toContain("Uptime");
  });
});
