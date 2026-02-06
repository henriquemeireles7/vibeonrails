/**
 * Dev Request Timing Middleware — Tests
 *
 * Tests for timing capture, formatting, threshold highlighting,
 * and production disable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  colorizeDuration,
  formatTimingLog,
  isProduction,
  TIMING_THRESHOLDS,
  type TimingPhase,
} from "./timing.js";

describe("TIMING_THRESHOLDS", () => {
  it("should have warn threshold at 50ms", () => {
    expect(TIMING_THRESHOLDS.warn).toBe(50);
  });

  it("should have error threshold at 100ms", () => {
    expect(TIMING_THRESHOLDS.error).toBe(100);
  });
});

describe("isProduction", () => {
  const originalEnv = process.env["NODE_ENV"];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["NODE_ENV"] = originalEnv;
    } else {
      delete process.env["NODE_ENV"];
    }
  });

  it("should return true when NODE_ENV is production", () => {
    process.env["NODE_ENV"] = "production";
    expect(isProduction()).toBe(true);
  });

  it("should return false when NODE_ENV is development", () => {
    process.env["NODE_ENV"] = "development";
    expect(isProduction()).toBe(false);
  });

  it("should return false when NODE_ENV is not set", () => {
    delete process.env["NODE_ENV"];
    expect(isProduction()).toBe(false);
  });
});

describe("colorizeDuration", () => {
  it("should return plain text for fast requests", () => {
    const result = colorizeDuration(10);
    expect(result).toBe("10ms");
  });

  it("should return yellow for warn threshold", () => {
    const result = colorizeDuration(50);
    expect(result).toContain("50ms");
    expect(result).toContain("\x1b[33m"); // Yellow ANSI code
  });

  it("should return red for error threshold", () => {
    const result = colorizeDuration(100);
    expect(result).toContain("100ms");
    expect(result).toContain("\x1b[31m"); // Red ANSI code
  });

  it("should return red for very slow requests", () => {
    const result = colorizeDuration(500);
    expect(result).toContain("500ms");
    expect(result).toContain("\x1b[31m");
  });
});

describe("formatTimingLog", () => {
  it("should format basic request log", () => {
    const log = formatTimingLog(200, "GET", "/api/users", 15, []);
    expect(log).toContain("[200 OK]");
    expect(log).toContain("GET");
    expect(log).toContain("/api/users");
    expect(log).toContain("15ms");
  });

  it("should include phase breakdown", () => {
    const phases: TimingPhase[] = [
      { name: "auth", durationMs: 1 },
      { name: "validate", durationMs: 2 },
      { name: "db", durationMs: 18 },
    ];

    const log = formatTimingLog(200, "POST", "/trpc/order.create", 23, phases);
    expect(log).toContain("auth: 1ms");
    expect(log).toContain("validate: 2ms");
    expect(log).toContain("db: 18ms");
  });

  it("should handle different status codes", () => {
    expect(formatTimingLog(201, "POST", "/api/users", 10, [])).toContain(
      "[201 Created]",
    );
    expect(formatTimingLog(404, "GET", "/api/missing", 5, [])).toContain(
      "[404 Not Found]",
    );
    expect(formatTimingLog(500, "GET", "/api/error", 100, [])).toContain(
      "[500 Server Error]",
    );
  });

  it("should handle unknown status codes", () => {
    const log = formatTimingLog(418, "GET", "/api/teapot", 10, []);
    expect(log).toContain("[418 418]");
  });

  it("should colorize slow total times", () => {
    const slowLog = formatTimingLog(200, "GET", "/api/slow", 150, []);
    expect(slowLog).toContain("\x1b[31m"); // Red for >100ms
  });
});
