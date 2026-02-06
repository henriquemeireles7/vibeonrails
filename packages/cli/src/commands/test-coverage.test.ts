/**
 * `vibe test coverage` — Tests
 *
 * Tests for per-package coverage reporting:
 * - Package discovery
 * - Coverage JSON parsing
 * - Metric computation
 * - Per-package aggregation
 * - Threshold enforcement
 * - Badge generation
 * - Uncovered file listing
 * - Report formatting
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
  discoverTestablePackages,
  parseCoverageJson,
  computeMetric,
  computeBranchMetric,
  aggregatePackageCoverage,
  generateBadgeSvg,
  writeBadge,
  formatCoverageReport,
  type FileCoverage,
  type CoverageReport,
} from "./test-coverage.js";

// ---------------------------------------------------------------------------
// discoverTestablePackages
// ---------------------------------------------------------------------------

describe("discoverTestablePackages", () => {
  const testDir = join(tmpdir(), "vibe-coverage-discover-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should discover packages with test scripts", () => {
    // Create packages
    const coreDir = join(testDir, "packages", "core");
    mkdirSync(coreDir, { recursive: true });
    writeFileSync(
      join(coreDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/core",
        scripts: { test: "vitest run" },
      }),
    );

    const webDir = join(testDir, "packages", "web");
    mkdirSync(webDir, { recursive: true });
    writeFileSync(
      join(webDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/web",
        scripts: { test: "vitest run" },
      }),
    );

    const packages = discoverTestablePackages(testDir);
    expect(packages).toHaveLength(2);
  });

  it("should skip packages without test scripts", () => {
    const coreDir = join(testDir, "packages", "core");
    mkdirSync(coreDir, { recursive: true });
    writeFileSync(
      join(coreDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/core",
        scripts: { build: "tsup" },
      }),
    );

    const packages = discoverTestablePackages(testDir);
    expect(packages).toHaveLength(0);
  });

  it("should discover nested packages (e.g., packages/features/payments)", () => {
    const paymentsDir = join(testDir, "packages", "features", "payments");
    mkdirSync(paymentsDir, { recursive: true });
    writeFileSync(
      join(paymentsDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/payments",
        scripts: { test: "vitest run" },
      }),
    );

    const packages = discoverTestablePackages(testDir);
    expect(packages).toHaveLength(1);
    expect(packages[0]).toContain("payments");
  });

  it("should return empty when packages/ does not exist", () => {
    const packages = discoverTestablePackages(testDir);
    expect(packages).toEqual([]);
  });

  it("should skip node_modules and dist directories", () => {
    const nmDir = join(testDir, "packages", "node_modules", "pkg");
    mkdirSync(nmDir, { recursive: true });
    writeFileSync(
      join(nmDir, "package.json"),
      JSON.stringify({ scripts: { test: "jest" } }),
    );

    const packages = discoverTestablePackages(testDir);
    expect(packages).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseCoverageJson
// ---------------------------------------------------------------------------

describe("parseCoverageJson", () => {
  const testDir = join(tmpdir(), "vibe-coverage-parse-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should parse Istanbul format coverage JSON", () => {
    const coverageData = {
      "/src/utils.ts": {
        s: { "0": 5, "1": 3, "2": 0 }, // 2 of 3 covered
        b: { "0": [1, 0], "1": [3, 2] }, // 3 of 4 covered
        f: { "0": 5, "1": 0 }, // 1 of 2 covered
      },
    };

    const coveragePath = join(testDir, "coverage-final.json");
    writeFileSync(coveragePath, JSON.stringify(coverageData));

    const files = parseCoverageJson(coveragePath);
    expect(files).toHaveLength(1);
    expect(files[0]!.file).toBe("/src/utils.ts");
    expect(files[0]!.statements.total).toBe(3);
    expect(files[0]!.statements.covered).toBe(2);
    expect(files[0]!.statements.pct).toBeCloseTo(66.67, 1);
  });

  it("should return empty for missing file", () => {
    const files = parseCoverageJson(join(testDir, "missing.json"));
    expect(files).toEqual([]);
  });

  it("should return empty for invalid JSON", () => {
    writeFileSync(join(testDir, "bad.json"), "not json");
    const files = parseCoverageJson(join(testDir, "bad.json"));
    expect(files).toEqual([]);
  });

  it("should handle multiple files", () => {
    const coverageData = {
      "/src/a.ts": { s: { "0": 1 }, b: {}, f: { "0": 1 } },
      "/src/b.ts": { s: { "0": 0 }, b: {}, f: { "0": 0 } },
    };

    const coveragePath = join(testDir, "coverage-final.json");
    writeFileSync(coveragePath, JSON.stringify(coverageData));

    const files = parseCoverageJson(coveragePath);
    expect(files).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// computeMetric
// ---------------------------------------------------------------------------

describe("computeMetric", () => {
  it("should compute coverage from hit counts", () => {
    const metric = computeMetric([5, 3, 0, 1, 0]);
    expect(metric.total).toBe(5);
    expect(metric.covered).toBe(3);
    expect(metric.pct).toBe(60);
  });

  it("should return 100% for empty arrays", () => {
    const metric = computeMetric([]);
    expect(metric.pct).toBe(100);
    expect(metric.total).toBe(0);
  });

  it("should return 100% for all covered", () => {
    const metric = computeMetric([1, 2, 3]);
    expect(metric.pct).toBe(100);
    expect(metric.covered).toBe(3);
  });

  it("should return 0% for all uncovered", () => {
    const metric = computeMetric([0, 0, 0]);
    expect(metric.pct).toBe(0);
    expect(metric.covered).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeBranchMetric
// ---------------------------------------------------------------------------

describe("computeBranchMetric", () => {
  it("should flatten branch arrays and compute metric", () => {
    const metric = computeBranchMetric([
      [1, 0], // branch 1: then=hit, else=miss
      [3, 2], // branch 2: both hit
    ]);
    expect(metric.total).toBe(4);
    expect(metric.covered).toBe(3);
    expect(metric.pct).toBe(75);
  });

  it("should return 100% for empty branches", () => {
    const metric = computeBranchMetric([]);
    expect(metric.pct).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// aggregatePackageCoverage
// ---------------------------------------------------------------------------

describe("aggregatePackageCoverage", () => {
  const files: FileCoverage[] = [
    {
      file: "/src/a.ts",
      statements: { total: 10, covered: 8, pct: 80 },
      branches: { total: 4, covered: 3, pct: 75 },
      functions: { total: 3, covered: 3, pct: 100 },
      lines: { total: 10, covered: 8, pct: 80 },
    },
    {
      file: "/src/b.ts",
      statements: { total: 20, covered: 20, pct: 100 },
      branches: { total: 6, covered: 6, pct: 100 },
      functions: { total: 5, covered: 5, pct: 100 },
      lines: { total: 20, covered: 20, pct: 100 },
    },
  ];

  it("should aggregate file coverage into package summary", () => {
    const pkg = aggregatePackageCoverage("core", "packages/core", files, 80);
    expect(pkg.name).toBe("core");
    expect(pkg.statements.total).toBe(30);
    expect(pkg.statements.covered).toBe(28);
    expect(pkg.statements.pct).toBeCloseTo(93.33, 1);
  });

  it("should pass threshold when coverage is sufficient", () => {
    const pkg = aggregatePackageCoverage("core", "packages/core", files, 80);
    expect(pkg.passesThreshold).toBe(true);
  });

  it("should fail threshold when coverage is insufficient", () => {
    const lowFiles: FileCoverage[] = [
      {
        file: "/src/c.ts",
        statements: { total: 10, covered: 5, pct: 50 },
        branches: { total: 4, covered: 2, pct: 50 },
        functions: { total: 3, covered: 1, pct: 33 },
        lines: { total: 10, covered: 5, pct: 50 },
      },
    ];
    const pkg = aggregatePackageCoverage(
      "low",
      "packages/low",
      lowFiles,
      80,
    );
    expect(pkg.passesThreshold).toBe(false);
  });

  it("should list uncovered files (< 50% statements)", () => {
    const mixedFiles: FileCoverage[] = [
      {
        file: "/src/covered.ts",
        statements: { total: 10, covered: 9, pct: 90 },
        branches: { total: 0, covered: 0, pct: 100 },
        functions: { total: 0, covered: 0, pct: 100 },
        lines: { total: 10, covered: 9, pct: 90 },
      },
      {
        file: "/src/uncovered.ts",
        statements: { total: 10, covered: 3, pct: 30 },
        branches: { total: 0, covered: 0, pct: 100 },
        functions: { total: 0, covered: 0, pct: 100 },
        lines: { total: 10, covered: 3, pct: 30 },
      },
    ];
    const pkg = aggregatePackageCoverage(
      "mixed",
      "packages/mixed",
      mixedFiles,
      80,
    );
    expect(pkg.uncoveredFiles).toContain("/src/uncovered.ts");
    expect(pkg.uncoveredFiles).not.toContain("/src/covered.ts");
  });

  it("should handle empty files array", () => {
    const pkg = aggregatePackageCoverage("empty", "packages/empty", [], 80);
    expect(pkg.statements.pct).toBe(100);
    expect(pkg.passesThreshold).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Badge Generation
// ---------------------------------------------------------------------------

describe("generateBadgeSvg", () => {
  it("should generate valid SVG", () => {
    const svg = generateBadgeSvg("core", 85);
    expect(svg).toContain("<svg");
    expect(svg).toContain("85%");
    expect(svg).toContain("coverage");
  });

  it("should use green color for high coverage (90+)", () => {
    const svg = generateBadgeSvg("core", 95);
    expect(svg).toContain("#4c1");
  });

  it("should use yellow-green for 80-89%", () => {
    const svg = generateBadgeSvg("core", 85);
    expect(svg).toContain("#97ca00");
  });

  it("should use yellow for 70-79%", () => {
    const svg = generateBadgeSvg("core", 75);
    expect(svg).toContain("#dfb317");
  });

  it("should use orange for 50-69%", () => {
    const svg = generateBadgeSvg("core", 60);
    expect(svg).toContain("#fe7d37");
  });

  it("should use red for below 50%", () => {
    const svg = generateBadgeSvg("core", 30);
    expect(svg).toContain("#e05d44");
  });
});

describe("writeBadge", () => {
  const testDir = join(tmpdir(), "vibe-coverage-badge-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should write badge SVG to package directory", () => {
    const badgePath = writeBadge(testDir, "core", 85);
    expect(existsSync(badgePath)).toBe(true);
    const content = readFileSync(badgePath, "utf-8");
    expect(content).toContain("85%");
  });
});

// ---------------------------------------------------------------------------
// formatCoverageReport
// ---------------------------------------------------------------------------

describe("formatCoverageReport", () => {
  it("should format a passing report", () => {
    const report: CoverageReport = {
      packages: [
        {
          name: "@vibeonrails/core",
          path: "packages/core",
          statements: { total: 100, covered: 90, pct: 90 },
          branches: { total: 20, covered: 18, pct: 90 },
          functions: { total: 30, covered: 28, pct: 93.33 },
          lines: { total: 100, covered: 90, pct: 90 },
          files: [],
          uncoveredFiles: [],
          passesThreshold: true,
        },
      ],
      total: { total: 100, covered: 90, pct: 90 },
      threshold: 80,
      allPass: true,
      generatedAt: new Date().toISOString(),
    };

    const output = formatCoverageReport(report);
    expect(output).toContain("Coverage Report");
    expect(output).toContain("@vibeonrails/core");
    expect(output).toContain("90%");
  });

  it("should format a failing report", () => {
    const report: CoverageReport = {
      packages: [
        {
          name: "@vibeonrails/web",
          path: "packages/web",
          statements: { total: 100, covered: 60, pct: 60 },
          branches: { total: 20, covered: 10, pct: 50 },
          functions: { total: 30, covered: 15, pct: 50 },
          lines: { total: 100, covered: 60, pct: 60 },
          files: [],
          uncoveredFiles: ["/src/untested.ts"],
          passesThreshold: false,
        },
      ],
      total: { total: 100, covered: 60, pct: 60 },
      threshold: 80,
      allPass: false,
      generatedAt: new Date().toISOString(),
    };

    const output = formatCoverageReport(report);
    expect(output).toContain("60%");
    expect(output).toContain("threshold");
  });

  it("should show uncovered file count", () => {
    const report: CoverageReport = {
      packages: [
        {
          name: "pkg",
          path: "packages/pkg",
          statements: { total: 50, covered: 30, pct: 60 },
          branches: { total: 0, covered: 0, pct: 100 },
          functions: { total: 0, covered: 0, pct: 100 },
          lines: { total: 50, covered: 30, pct: 60 },
          files: [],
          uncoveredFiles: ["/a.ts", "/b.ts"],
          passesThreshold: false,
        },
      ],
      total: { total: 50, covered: 30, pct: 60 },
      threshold: 80,
      allPass: false,
      generatedAt: new Date().toISOString(),
    };

    const output = formatCoverageReport(report);
    expect(output).toContain("Uncovered: 2 file(s)");
  });
});
