import { describe, it, expect } from "vitest";
import { calculateScore, buildReport } from "../scorer.js";
import type { AuditCheckResult } from "../types.js";

function makeResult(
  id: string,
  status: "pass" | "fail" | "warn" | "skip",
  severity: "critical" | "high" | "medium" | "low" = "medium",
): AuditCheckResult {
  return {
    id,
    name: `Check ${id}`,
    category: "top30",
    severity,
    description: `Desc ${id}`,
    automatable: true,
    autoFixable: false,
    status,
    findings: status === "fail" ? [{ file: "x.ts", message: "fail" }] : [],
  };
}

describe("calculateScore", () => {
  it("returns 100 when all checks pass", () => {
    const results = [
      makeResult("A", "pass", "critical"),
      makeResult("B", "pass", "high"),
      makeResult("C", "pass", "medium"),
    ];
    expect(calculateScore(results)).toBe(100);
  });

  it("returns 0 when all checks fail", () => {
    const results = [
      makeResult("A", "fail", "critical"),
      makeResult("B", "fail", "high"),
    ];
    expect(calculateScore(results)).toBe(0);
  });

  it("weights critical failures more heavily", () => {
    const allHigh = [
      makeResult("A", "pass", "critical"),
      makeResult("B", "fail", "high"),
    ];
    const allCritical = [
      makeResult("A", "fail", "critical"),
      makeResult("B", "pass", "high"),
    ];
    // Critical failure should reduce score more than high failure
    expect(calculateScore(allCritical)).toBeLessThan(calculateScore(allHigh));
  });

  it("excludes skipped checks from score calculation", () => {
    const results = [
      makeResult("A", "pass", "critical"),
      makeResult("B", "skip", "critical"),
    ];
    // Only A counts, and it passes, so score should be 100
    expect(calculateScore(results)).toBe(100);
  });

  it("treats warns as partial pass", () => {
    const withWarn = [makeResult("A", "warn", "high")];
    const score = calculateScore(withWarn);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("returns 100 for empty results", () => {
    expect(calculateScore([])).toBe(100);
  });
});

describe("buildReport", () => {
  it("builds a complete report from results", () => {
    const results = [
      makeResult("A", "pass"),
      makeResult("B", "fail"),
      makeResult("C", "warn"),
      makeResult("D", "skip"),
    ];

    const report = buildReport(results, "/test");

    expect(report.totalChecks).toBe(4);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.warned).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.projectRoot).toBe("/test");
    expect(report.timestamp).toBeDefined();
    expect(report.score).toBeDefined();
    expect(report.results).toHaveLength(4);
  });
});
