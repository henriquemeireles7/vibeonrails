/**
 * Support Feedback — CLI Tests
 *
 * Tests for feedback summary and export commands.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { feedbackSummary, feedbackExport, parseDuration } from "./cli.js";
import type { JsonlEntry } from "./types.js";

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

const TEST_ROOT = join(process.cwd(), ".test-feedback-cli");
const JSONL_PATH = join(TEST_ROOT, "content", "feedback", "requests.jsonl");

function makeEntry(overrides: Partial<JsonlEntry> = {}): JsonlEntry {
  return {
    timestamp: new Date().toISOString(),
    content: "Test feedback",
    source: "chat",
    category: "bug",
    userId: "user_1",
    slug: "test-feedback",
    tags: ["test"],
    ...overrides,
  };
}

async function writeEntries(entries: JsonlEntry[]): Promise<void> {
  await mkdir(join(TEST_ROOT, "content", "feedback"), { recursive: true });
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await writeFile(JSONL_PATH, lines, "utf-8");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseDuration", () => {
  it("should parse days", () => {
    expect(parseDuration("7d")).toBe(7 * 86400000);
  });

  it("should parse hours", () => {
    expect(parseDuration("24h")).toBe(24 * 3600000);
  });

  it("should parse minutes", () => {
    expect(parseDuration("30m")).toBe(30 * 60000);
  });

  it("should parse seconds", () => {
    expect(parseDuration("60s")).toBe(60000);
  });

  it("should return 0 for invalid format", () => {
    expect(parseDuration("invalid")).toBe(0);
  });
});

describe("feedbackSummary", () => {
  beforeEach(async () => {
    await mkdir(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  it("should return empty summary when no JSONL file exists", async () => {
    const summary = await feedbackSummary({
      projectRoot: TEST_ROOT,
    });

    expect(summary.total).toBe(0);
    expect(summary.byCategory.bug).toBe(0);
  });

  it("should count entries by category", async () => {
    await writeEntries([
      makeEntry({ category: "bug" }),
      makeEntry({ category: "bug" }),
      makeEntry({ category: "question" }),
      makeEntry({ category: "feature-aligned" }),
    ]);

    const summary = await feedbackSummary({
      projectRoot: TEST_ROOT,
      jsonlPath: JSONL_PATH,
    });

    expect(summary.total).toBe(4);
    expect(summary.byCategory.bug).toBe(2);
    expect(summary.byCategory.question).toBe(1);
    expect(summary.byCategory["feature-aligned"]).toBe(1);
  });

  it("should count entries by source", async () => {
    await writeEntries([
      makeEntry({ source: "chat" }),
      makeEntry({ source: "chat" }),
      makeEntry({ source: "github" }),
    ]);

    const summary = await feedbackSummary({
      projectRoot: TEST_ROOT,
      jsonlPath: JSONL_PATH,
    });

    expect(summary.bySource.chat).toBe(2);
    expect(summary.bySource.github).toBe(1);
  });

  it("should compute top tags", async () => {
    await writeEntries([
      makeEntry({ tags: ["login", "auth"] }),
      makeEntry({ tags: ["login", "ui"] }),
      makeEntry({ tags: ["auth", "security"] }),
    ]);

    const summary = await feedbackSummary({
      projectRoot: TEST_ROOT,
      jsonlPath: JSONL_PATH,
    });

    expect(summary.topTags.length).toBeGreaterThan(0);
    // 'login' and 'auth' should both appear twice
    const loginTag = summary.topTags.find((t) => t.tag === "login");
    expect(loginTag?.count).toBe(2);
  });

  it("should filter by time window", async () => {
    const oldEntry = makeEntry({
      timestamp: new Date(Date.now() - 90 * 86400000).toISOString(),
      slug: "old",
    });
    const recentEntry = makeEntry({
      timestamp: new Date().toISOString(),
      slug: "recent",
    });

    await writeEntries([oldEntry, recentEntry]);

    const summary = await feedbackSummary({
      projectRoot: TEST_ROOT,
      jsonlPath: JSONL_PATH,
      since: "30d",
    });

    expect(summary.total).toBe(1);
  });
});

describe("feedbackExport", () => {
  beforeEach(async () => {
    await mkdir(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  it("should export to JSON format", async () => {
    await writeEntries([
      makeEntry({ content: "Bug report 1" }),
      makeEntry({ content: "Feature request" }),
    ]);

    const outputPath = join(TEST_ROOT, "export.json");

    await feedbackExport({
      projectRoot: TEST_ROOT,
      jsonlPath: JSONL_PATH,
      format: "json",
      outputPath,
    });

    const content = await readFile(outputPath, "utf-8");
    const data = JSON.parse(content) as unknown[];
    expect(data).toHaveLength(2);
  });

  it("should export to CSV format", async () => {
    await writeEntries([makeEntry({ content: "Test content" })]);

    const outputPath = join(TEST_ROOT, "export.csv");

    await feedbackExport({
      projectRoot: TEST_ROOT,
      jsonlPath: JSONL_PATH,
      format: "csv",
      outputPath,
    });

    const content = await readFile(outputPath, "utf-8");
    expect(content).toContain("timestamp,source,category");
    expect(content).toContain("Test content");
  });

  it("should filter by category", async () => {
    await writeEntries([
      makeEntry({ category: "bug", content: "Bug" }),
      makeEntry({ category: "question", content: "Question" }),
    ]);

    const outputPath = join(TEST_ROOT, "export.json");

    await feedbackExport({
      projectRoot: TEST_ROOT,
      jsonlPath: JSONL_PATH,
      format: "json",
      category: "bug",
      outputPath,
    });

    const content = await readFile(outputPath, "utf-8");
    const data = JSON.parse(content) as unknown[];
    expect(data).toHaveLength(1);
  });

  it("should handle empty JSONL gracefully", async () => {
    const outputPath = join(TEST_ROOT, "export.json");

    await feedbackExport({
      projectRoot: TEST_ROOT,
      format: "json",
      outputPath,
    });

    const content = await readFile(outputPath, "utf-8");
    const data = JSON.parse(content) as unknown[];
    expect(data).toHaveLength(0);
  });
});
