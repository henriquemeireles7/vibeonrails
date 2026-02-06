/**
 * HTTP Fixture Recording and Playback
 *
 * Record HTTP responses for deterministic testing.
 * Fixtures are stored as JSON files and replayed in tests.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/**
 * Recorded HTTP fixture.
 */
export interface HttpFixture {
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly recordedAt: string;
}

/**
 * Fixture store for test suites.
 */
export class FixtureStore {
  private readonly fixtureDir: string;
  private readonly fixtures: Map<string, HttpFixture>;

  constructor(fixtureDir: string) {
    this.fixtureDir = fixtureDir;
    this.fixtures = new Map();
  }

  /**
   * Generate a fixture key from request details.
   */
  fixtureKey(method: string, url: string): string {
    return `${method.toUpperCase()}-${url.replace(/[^a-zA-Z0-9]/g, "_")}`;
  }

  /**
   * Record an HTTP response as a fixture.
   */
  record(
    method: string,
    url: string,
    response: Omit<HttpFixture, "url" | "method" | "recordedAt">,
  ): void {
    const key = this.fixtureKey(method, url);
    const fixture: HttpFixture = {
      url,
      method: method.toUpperCase(),
      ...response,
      recordedAt: new Date().toISOString(),
    };

    this.fixtures.set(key, fixture);

    // Save to disk
    const filePath = join(this.fixtureDir, `${key}.json`);
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(fixture, null, 2), "utf-8");
  }

  /**
   * Replay a recorded fixture.
   */
  replay(method: string, url: string): HttpFixture | null {
    const key = this.fixtureKey(method, url);

    // Check memory first
    const cached = this.fixtures.get(key);
    if (cached) return cached;

    // Check disk
    const filePath = join(this.fixtureDir, `${key}.json`);
    if (existsSync(filePath)) {
      const fixture = JSON.parse(
        readFileSync(filePath, "utf-8"),
      ) as HttpFixture;
      this.fixtures.set(key, fixture);
      return fixture;
    }

    return null;
  }

  /**
   * Check if a fixture exists.
   */
  has(method: string, url: string): boolean {
    return this.replay(method, url) !== null;
  }
}
