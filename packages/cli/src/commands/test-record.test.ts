/**
 * `vibe test record` — Tests
 *
 * Tests for HTTP fixture recording CLI:
 * - Recording fixtures to disk
 * - Loading/replaying fixtures
 * - Staleness detection
 * - Update flow
 * - Clean unused fixtures
 * - Fixture manifest management
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import {
  fixtureKey,
  fixtureFilename,
  loadFixtureManifest,
  saveFixtureManifest,
  recordFixture,
  loadFixture,
  listFixtures,
  detectStaleFixtures,
  cleanUnusedFixtures,
  buildRecordCommand,
  type RecordedFixture,
} from "./test-record.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFixture(overrides: Partial<RecordedFixture> = {}): RecordedFixture {
  return {
    url: "https://api.example.com/users",
    method: "GET",
    status: 200,
    requestHeaders: { authorization: "Bearer test" },
    responseHeaders: { "content-type": "application/json" },
    requestBody: null,
    responseBody: [{ id: 1, name: "Alice" }],
    recordedAt: new Date().toISOString(),
    testFile: "src/api.test.ts",
    durationMs: 150,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// fixtureKey
// ---------------------------------------------------------------------------

describe("fixtureKey", () => {
  it("should generate a unique key from method and URL", () => {
    const key = fixtureKey("GET", "https://api.example.com/users");
    expect(key).toMatch(/^GET-/);
    expect(key).toContain("api_example_com");
  });

  it("should uppercase the method", () => {
    const key = fixtureKey("post", "https://api.example.com/data");
    expect(key).toMatch(/^POST-/);
  });

  it("should generate different keys for different URLs", () => {
    const key1 = fixtureKey("GET", "https://api.example.com/users");
    const key2 = fixtureKey("GET", "https://api.example.com/posts");
    expect(key1).not.toBe(key2);
  });

  it("should generate different keys for different methods", () => {
    const key1 = fixtureKey("GET", "https://api.example.com/users");
    const key2 = fixtureKey("POST", "https://api.example.com/users");
    expect(key1).not.toBe(key2);
  });

  it("should truncate long URLs", () => {
    const longUrl = "https://api.example.com/" + "a".repeat(500);
    const key = fixtureKey("GET", longUrl);
    // Method prefix + dash + 200 chars
    expect(key.length).toBeLessThanOrEqual(210);
  });
});

// ---------------------------------------------------------------------------
// fixtureFilename
// ---------------------------------------------------------------------------

describe("fixtureFilename", () => {
  it("should append .json extension", () => {
    expect(fixtureFilename("GET-users")).toBe("GET-users.json");
  });
});

// ---------------------------------------------------------------------------
// Fixture Manifest
// ---------------------------------------------------------------------------

describe("Fixture Manifest", () => {
  const testDir = join(tmpdir(), "vibe-fixture-manifest-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return default manifest when none exists", () => {
    const manifest = loadFixtureManifest(testDir);
    expect(manifest.version).toBe("1.0");
    expect(Object.keys(manifest.fixtures)).toHaveLength(0);
  });

  it("should save and load manifest", () => {
    const manifest = {
      version: "1.0",
      fixtures: {
        "GET-users": {
          file: "GET-users.json",
          method: "GET",
          url: "https://api.example.com/users",
          recordedAt: "2026-01-01T00:00:00.000Z",
          testFile: "test.ts",
          stale: false,
        },
      },
    };

    saveFixtureManifest(testDir, manifest);
    const loaded = loadFixtureManifest(testDir);
    expect(loaded).toEqual(manifest);
  });

  it("should create directory if it does not exist", () => {
    const nestedDir = join(testDir, "deep", "nested");
    saveFixtureManifest(nestedDir, { version: "1.0", fixtures: {} });
    expect(existsSync(join(nestedDir, "fixture-manifest.json"))).toBe(true);
  });

  it("should handle corrupted manifest gracefully", () => {
    writeFileSync(
      join(testDir, "fixture-manifest.json"),
      "not valid json {{",
    );
    const manifest = loadFixtureManifest(testDir);
    expect(manifest.version).toBe("1.0");
    expect(Object.keys(manifest.fixtures)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// recordFixture
// ---------------------------------------------------------------------------

describe("recordFixture", () => {
  const testDir = join(tmpdir(), "vibe-record-fixture-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should save fixture to disk", () => {
    const fixture = createFixture();
    const filePath = recordFixture(testDir, fixture);

    expect(existsSync(filePath)).toBe(true);
    const saved = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(saved.url).toBe(fixture.url);
    expect(saved.method).toBe(fixture.method);
    expect(saved.status).toBe(200);
  });

  it("should update the manifest", () => {
    const fixture = createFixture();
    recordFixture(testDir, fixture);

    const manifest = loadFixtureManifest(testDir);
    const entries = Object.values(manifest.fixtures);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.url).toBe(fixture.url);
    expect(entries[0]!.stale).toBe(false);
  });

  it("should overwrite existing fixture with same key", () => {
    const fixture1 = createFixture({ status: 200 });
    recordFixture(testDir, fixture1);

    const fixture2 = createFixture({ status: 201 });
    const filePath = recordFixture(testDir, fixture2);

    const saved = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(saved.status).toBe(201);

    // Manifest should still have one entry
    const manifest = loadFixtureManifest(testDir);
    expect(Object.values(manifest.fixtures)).toHaveLength(1);
  });

  it("should create directory if it does not exist", () => {
    const nestedDir = join(testDir, "nested", "fixtures");
    const fixture = createFixture();
    recordFixture(nestedDir, fixture);
    expect(existsSync(nestedDir)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// loadFixture
// ---------------------------------------------------------------------------

describe("loadFixture", () => {
  const testDir = join(tmpdir(), "vibe-load-fixture-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should load a recorded fixture", () => {
    const fixture = createFixture();
    recordFixture(testDir, fixture);

    const loaded = loadFixture(testDir, "GET", "https://api.example.com/users");
    expect(loaded).not.toBeNull();
    expect(loaded!.url).toBe(fixture.url);
    expect(loaded!.responseBody).toEqual([{ id: 1, name: "Alice" }]);
  });

  it("should return null for unrecorded fixture", () => {
    const loaded = loadFixture(testDir, "GET", "https://missing.com");
    expect(loaded).toBeNull();
  });

  it("should return null for corrupted fixture file", () => {
    const key = fixtureKey("GET", "https://api.example.com/corrupt");
    writeFileSync(
      join(testDir, fixtureFilename(key)),
      "not json {{",
    );
    const loaded = loadFixture(testDir, "GET", "https://api.example.com/corrupt");
    expect(loaded).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listFixtures
// ---------------------------------------------------------------------------

describe("listFixtures", () => {
  const testDir = join(tmpdir(), "vibe-list-fixtures-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return empty array when no fixtures", () => {
    const fixtures = listFixtures(testDir);
    expect(fixtures).toEqual([]);
  });

  it("should list all recorded fixtures", () => {
    recordFixture(testDir, createFixture({ method: "GET" }));
    recordFixture(
      testDir,
      createFixture({
        method: "POST",
        url: "https://api.example.com/data",
      }),
    );

    const fixtures = listFixtures(testDir);
    expect(fixtures).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// detectStaleFixtures
// ---------------------------------------------------------------------------

describe("detectStaleFixtures", () => {
  const testDir = join(tmpdir(), "vibe-stale-fixtures-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should detect fixtures older than staleDays", () => {
    // Record a fixture with a date 60 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);

    recordFixture(
      testDir,
      createFixture({ recordedAt: oldDate.toISOString() }),
    );

    const stale = detectStaleFixtures(testDir, 30);
    expect(stale).toHaveLength(1);
  });

  it("should not flag recent fixtures as stale", () => {
    recordFixture(testDir, createFixture());

    const stale = detectStaleFixtures(testDir, 30);
    expect(stale).toHaveLength(0);
  });

  it("should use default stale days (30) when not specified", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 15);

    recordFixture(
      testDir,
      createFixture({ recordedAt: recentDate.toISOString() }),
    );

    const stale = detectStaleFixtures(testDir);
    expect(stale).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// cleanUnusedFixtures
// ---------------------------------------------------------------------------

describe("cleanUnusedFixtures", () => {
  const testDir = join(tmpdir(), "vibe-clean-fixtures-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should remove JSON files not in manifest", () => {
    // Record a fixture (creates manifest entry)
    recordFixture(testDir, createFixture());

    // Create an orphan fixture file
    writeFileSync(join(testDir, "orphan.json"), "{}");

    const removed = cleanUnusedFixtures(testDir);
    expect(removed).toContain("orphan.json");
    expect(existsSync(join(testDir, "orphan.json"))).toBe(false);
  });

  it("should not remove fixtures in the manifest", () => {
    recordFixture(testDir, createFixture());

    const removed = cleanUnusedFixtures(testDir);
    expect(removed).toHaveLength(0);
  });

  it("should not remove the manifest file", () => {
    saveFixtureManifest(testDir, { version: "1.0", fixtures: {} });

    const removed = cleanUnusedFixtures(testDir);
    expect(existsSync(join(testDir, "fixture-manifest.json"))).toBe(true);
  });

  it("should return empty when directory does not exist", () => {
    const removed = cleanUnusedFixtures(join(testDir, "nonexistent"));
    expect(removed).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildRecordCommand
// ---------------------------------------------------------------------------

describe("buildRecordCommand", () => {
  it("should build a vitest command with LIVE_API=true", () => {
    const cmd = buildRecordCommand("src/api.test.ts");
    expect(cmd).toBe("LIVE_API=true npx vitest run src/api.test.ts");
  });

  it("should use custom vitest binary", () => {
    const cmd = buildRecordCommand("src/api.test.ts", {
      vitestBin: "./node_modules/.bin/vitest",
    });
    expect(cmd).toBe(
      "LIVE_API=true ./node_modules/.bin/vitest run src/api.test.ts",
    );
  });
});
