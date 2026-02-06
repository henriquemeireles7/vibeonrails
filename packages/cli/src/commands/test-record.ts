/**
 * `vibe test record` — HTTP Fixture Recording CLI
 *
 * Records all HTTP interactions during test runs and saves them
 * as fixtures for deterministic replay in CI.
 *
 * Commands:
 *   vibe test record <test-file>          — Run test with LIVE_API=true, record fixtures
 *   vibe test record --update             — Re-record stale fixtures
 *   vibe test record --list               — List recorded fixtures
 *   vibe test record --clean              — Remove unused fixtures
 */

import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Recorded HTTP fixture entry.
 */
export interface RecordedFixture {
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly requestHeaders: Record<string, string>;
  readonly responseHeaders: Record<string, string>;
  readonly requestBody: unknown;
  readonly responseBody: unknown;
  readonly recordedAt: string;
  readonly testFile: string;
  readonly durationMs: number;
}

/**
 * Fixture manifest tracking all recorded fixtures.
 */
export interface FixtureManifest {
  readonly version: string;
  readonly fixtures: Record<string, FixtureEntry>;
}

/**
 * A fixture entry in the manifest.
 */
export interface FixtureEntry {
  readonly file: string;
  readonly method: string;
  readonly url: string;
  readonly recordedAt: string;
  readonly testFile: string;
  readonly stale: boolean;
}

/**
 * Options for fixture recording.
 */
export interface RecordOptions {
  readonly testFile?: string;
  readonly fixtureDir?: string;
  readonly update?: boolean;
  readonly list?: boolean;
  readonly clean?: boolean;
  readonly staleDays?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FIXTURE_DIR = "__tests__/fixtures";
const MANIFEST_FILE = "fixture-manifest.json";
const DEFAULT_STALE_DAYS = 30;

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Generate a fixture key from request details.
 */
export function fixtureKey(method: string, url: string): string {
  const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 200);
  return `${method.toUpperCase()}-${sanitizedUrl}`;
}

/**
 * Generate fixture filename from key.
 */
export function fixtureFilename(key: string): string {
  return `${key}.json`;
}

/**
 * Load the fixture manifest.
 */
export function loadFixtureManifest(fixtureDir: string): FixtureManifest {
  const manifestPath = join(fixtureDir, MANIFEST_FILE);
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      ) as FixtureManifest;
    } catch {
      // Corrupted manifest, start fresh
    }
  }
  return { version: "1.0", fixtures: {} };
}

/**
 * Save the fixture manifest.
 */
export function saveFixtureManifest(
  fixtureDir: string,
  manifest: FixtureManifest,
): void {
  const manifestPath = join(fixtureDir, MANIFEST_FILE);
  if (!existsSync(fixtureDir)) {
    mkdirSync(fixtureDir, { recursive: true });
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Record a fixture to disk.
 */
export function recordFixture(
  fixtureDir: string,
  fixture: RecordedFixture,
): string {
  if (!existsSync(fixtureDir)) {
    mkdirSync(fixtureDir, { recursive: true });
  }

  const key = fixtureKey(fixture.method, fixture.url);
  const filename = fixtureFilename(key);
  const filePath = join(fixtureDir, filename);

  writeFileSync(filePath, JSON.stringify(fixture, null, 2), "utf-8");

  // Update manifest
  const manifest = loadFixtureManifest(fixtureDir);
  const updatedFixtures = { ...manifest.fixtures };
  updatedFixtures[key] = {
    file: filename,
    method: fixture.method,
    url: fixture.url,
    recordedAt: fixture.recordedAt,
    testFile: fixture.testFile,
    stale: false,
  };

  saveFixtureManifest(fixtureDir, {
    ...manifest,
    fixtures: updatedFixtures,
  });

  return filePath;
}

/**
 * Load a recorded fixture from disk.
 */
export function loadFixture(
  fixtureDir: string,
  method: string,
  url: string,
): RecordedFixture | null {
  const key = fixtureKey(method, url);
  const filePath = join(fixtureDir, fixtureFilename(key));

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as RecordedFixture;
  } catch {
    return null;
  }
}

/**
 * List all recorded fixtures.
 */
export function listFixtures(
  fixtureDir: string,
): readonly FixtureEntry[] {
  const manifest = loadFixtureManifest(fixtureDir);
  return Object.values(manifest.fixtures);
}

/**
 * Detect stale fixtures (older than staleDays).
 */
export function detectStaleFixtures(
  fixtureDir: string,
  staleDays: number = DEFAULT_STALE_DAYS,
): readonly FixtureEntry[] {
  const manifest = loadFixtureManifest(fixtureDir);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);

  return Object.values(manifest.fixtures).filter((entry) => {
    const recordedDate = new Date(entry.recordedAt);
    return recordedDate < cutoff;
  });
}

/**
 * Clean unused fixtures (fixtures not in manifest).
 */
export function cleanUnusedFixtures(fixtureDir: string): readonly string[] {
  if (!existsSync(fixtureDir)) return [];

  const manifest = loadFixtureManifest(fixtureDir);
  const manifestFiles = new Set(
    Object.values(manifest.fixtures).map((e) => e.file),
  );

  // Add manifest file itself
  manifestFiles.add(MANIFEST_FILE);

  const allFiles = readdirSync(fixtureDir).filter((f) =>
    f.endsWith(".json"),
  );

  const removed: string[] = [];
  for (const file of allFiles) {
    if (!manifestFiles.has(file)) {
      rmSync(join(fixtureDir, file), { force: true });
      removed.push(file);
    }
  }

  return removed;
}

/**
 * Build the vitest command for recording fixtures.
 */
export function buildRecordCommand(
  testFile: string,
  options: { vitestBin?: string } = {},
): string {
  const vitest = options.vitestBin ?? "npx vitest";
  return `LIVE_API=true ${vitest} run ${testFile}`;
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe test record` command.
 */
export function testRecordCommand(): Command {
  const cmd = new Command("record")
    .description("Record HTTP fixtures for deterministic test replay")
    .argument("[test-file]", "Test file to record fixtures for")
    .option(
      "--fixture-dir <dir>",
      "Directory for fixtures",
      DEFAULT_FIXTURE_DIR,
    )
    .option("--update", "Re-record stale fixtures")
    .option("--list", "List all recorded fixtures")
    .option("--clean", "Remove unused fixture files")
    .option(
      "--stale-days <days>",
      "Days before a fixture is considered stale",
      String(DEFAULT_STALE_DAYS),
    )
    .action(
      async (
        testFile: string | undefined,
        options: {
          fixtureDir: string;
          update?: boolean;
          list?: boolean;
          clean?: boolean;
          staleDays: string;
        },
      ) => {
        const formatter = createFormatter();
        const fixtureDir = join(process.cwd(), options.fixtureDir);
        const staleDays = parseInt(options.staleDays, 10);

        // List mode
        if (options.list) {
          const fixtures = listFixtures(fixtureDir);
          if (fixtures.length === 0) {
            formatter.info("No fixtures recorded yet.");
            return;
          }

          formatter.table(
            ["Method", "URL", "Test File", "Recorded At", "Stale"],
            fixtures.map((f) => [
              f.method,
              f.url.substring(0, 60),
              f.testFile,
              new Date(f.recordedAt).toLocaleDateString(),
              f.stale ? "Yes" : "No",
            ]),
          );

          formatter.success({
            command: "test record --list",
            data: { fixtures, total: fixtures.length },
            message: `${fixtures.length} fixture(s) recorded`,
          });
          return;
        }

        // Clean mode
        if (options.clean) {
          const removed = cleanUnusedFixtures(fixtureDir);
          if (removed.length === 0) {
            formatter.info("No unused fixtures to clean.");
            return;
          }

          formatter.success({
            command: "test record --clean",
            data: { removed },
            message: `Removed ${removed.length} unused fixture(s)`,
          });
          return;
        }

        // Update mode
        if (options.update) {
          const stale = detectStaleFixtures(fixtureDir, staleDays);
          if (stale.length === 0) {
            formatter.info("No stale fixtures found.");
            return;
          }

          formatter.info(
            `Found ${stale.length} stale fixture(s). Re-recording...`,
          );

          // Group by test file
          const byTestFile = new Map<string, FixtureEntry[]>();
          for (const fixture of stale) {
            const existing = byTestFile.get(fixture.testFile) ?? [];
            existing.push(fixture);
            byTestFile.set(fixture.testFile, existing);
          }

          for (const [file] of byTestFile) {
            const recordCmd = buildRecordCommand(file);
            formatter.info(`Running: ${recordCmd}`);

            try {
              const { execSync } = await import("node:child_process");
              execSync(recordCmd, {
                cwd: process.cwd(),
                stdio: "inherit",
                env: { ...process.env, LIVE_API: "true" },
              });
            } catch {
              formatter.warn(`Failed to re-record fixtures for ${file}`);
            }
          }

          formatter.success({
            command: "test record --update",
            data: { updatedCount: stale.length },
            message: `Updated ${stale.length} stale fixture(s)`,
          });
          return;
        }

        // Record mode (default)
        if (!testFile) {
          formatter.error({
            command: "test record",
            message: "Please provide a test file to record",
            fix: "vibe test record <test-file>",
          });
          process.exit(1);
        }

        formatter.info(`Recording fixtures for ${testFile}...`);

        // Ensure fixture directory exists
        if (!existsSync(fixtureDir)) {
          mkdirSync(fixtureDir, { recursive: true });
        }

        const recordCmd = buildRecordCommand(testFile);
        formatter.info(`Running: ${recordCmd}`);

        try {
          const { execSync } = await import("node:child_process");
          execSync(recordCmd, {
            cwd: process.cwd(),
            stdio: "inherit",
            env: {
              ...process.env,
              LIVE_API: "true",
              FIXTURE_DIR: fixtureDir,
            },
          });

          formatter.success({
            command: "test record",
            data: { testFile, fixtureDir },
            message: `Fixtures recorded for ${testFile}`,
            nextSteps: [
              `Fixtures saved to ${options.fixtureDir}/`,
              "Commit fixtures to git for CI replay",
              `List fixtures: vibe test record --list`,
            ],
          });
        } catch {
          formatter.error({
            command: "test record",
            message: `Test run failed for ${testFile}`,
            fix: "Check test output above for errors",
          });
          process.exit(1);
        }
      },
    );

  return cmd;
}
