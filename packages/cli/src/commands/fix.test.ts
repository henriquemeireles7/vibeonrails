import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectMissingEnvVars,
  detectConfigIssues,
  detectMissingDeps,
  detectAllIssues,
  autoFix,
} from "./fix.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `vibe-fix-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("vibe fix", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = makeTmpDir();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // Missing Env Vars
  // -----------------------------------------------------------------------

  describe("detectMissingEnvVars", () => {
    it("detects missing env vars from .env.example", () => {
      writeFileSync(
        join(projectRoot, ".env.example"),
        "DATABASE_URL=postgres://...\nAPI_KEY=your-key\n",
      );

      const issues = detectMissingEnvVars(projectRoot);
      expect(issues).toHaveLength(2);
      expect(issues[0]!.description).toContain("DATABASE_URL");
      expect(issues[1]!.description).toContain("API_KEY");
      expect(issues[0]!.autoFixable).toBe(true);
    });

    it("skips env vars that already exist in .env", () => {
      writeFileSync(
        join(projectRoot, ".env.example"),
        "DATABASE_URL=postgres://...\nAPI_KEY=your-key\n",
      );
      writeFileSync(join(projectRoot, ".env"), "DATABASE_URL=real-url\n");

      const issues = detectMissingEnvVars(projectRoot);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.description).toContain("API_KEY");
    });

    it("returns empty when no .env.example", () => {
      expect(detectMissingEnvVars(projectRoot)).toEqual([]);
    });

    it("auto-fixes by adding env vars to .env", () => {
      writeFileSync(
        join(projectRoot, ".env.example"),
        "NEW_VAR=default-value\n",
      );

      const issues = detectMissingEnvVars(projectRoot);
      expect(issues).toHaveLength(1);

      // Execute the fix
      issues[0]!.fix!();

      const envContent = readFileSync(join(projectRoot, ".env"), "utf-8");
      expect(envContent).toContain("NEW_VAR=default-value");
    });

    it("skips comments in .env.example", () => {
      writeFileSync(
        join(projectRoot, ".env.example"),
        "# This is a comment\nACTUAL_VAR=value\n",
      );

      const issues = detectMissingEnvVars(projectRoot);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.description).toContain("ACTUAL_VAR");
    });
  });

  // -----------------------------------------------------------------------
  // Config Issues
  // -----------------------------------------------------------------------

  describe("detectConfigIssues", () => {
    it("detects missing package.json", () => {
      const issues = detectConfigIssues(projectRoot);
      expect(issues.some((i) => i.id === "config-no-package-json")).toBe(true);
    });

    it("detects missing tsconfig.json", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const issues = detectConfigIssues(projectRoot);
      expect(issues.some((i) => i.id === "config-no-tsconfig")).toBe(true);
    });

    it("reports no issues when both exist", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ name: "test" }),
      );
      writeFileSync(
        join(projectRoot, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }),
      );

      const issues = detectConfigIssues(projectRoot);
      expect(issues).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Missing Dependencies
  // -----------------------------------------------------------------------

  describe("detectMissingDeps", () => {
    it("detects missing node_modules when lockfile exists", () => {
      writeFileSync(join(projectRoot, "pnpm-lock.yaml"), "lockfileVersion: 6");

      const issues = detectMissingDeps(projectRoot);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.id).toBe("deps-not-installed");
      expect(issues[0]!.autoFixable).toBe(true);
    });

    it("reports no issues when node_modules exists", () => {
      writeFileSync(join(projectRoot, "pnpm-lock.yaml"), "lockfileVersion: 6");
      mkdirSync(join(projectRoot, "node_modules"), { recursive: true });

      const issues = detectMissingDeps(projectRoot);
      expect(issues).toHaveLength(0);
    });

    it("reports no issues when no lockfile exists", () => {
      const issues = detectMissingDeps(projectRoot);
      expect(issues).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Auto-Fix
  // -----------------------------------------------------------------------

  describe("autoFix", () => {
    it("auto-fixes fixable issues and reports results", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ name: "test" }),
      );
      writeFileSync(
        join(projectRoot, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }),
      );
      writeFileSync(
        join(projectRoot, ".env.example"),
        "MISSING_VAR=default\n",
      );

      const result = autoFix(projectRoot);
      expect(result.totalIssues).toBe(1);
      expect(result.autoFixed).toBe(1);
      expect(result.needsHuman).toBe(0);
      expect(result.fixed[0]!.description).toContain("MISSING_VAR");

      // Verify fix was applied
      expect(existsSync(join(projectRoot, ".env"))).toBe(true);
    });

    it("reports no issues for healthy project", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ name: "test" }),
      );
      writeFileSync(
        join(projectRoot, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }),
      );

      const result = autoFix(projectRoot);
      expect(result.totalIssues).toBe(0);
      expect(result.autoFixed).toBe(0);
      expect(result.needsHuman).toBe(0);
    });

    it("reports non-fixable issues in manual list", () => {
      // No package.json = non-fixable
      const result = autoFix(projectRoot);
      expect(result.manual.length).toBeGreaterThan(0);
      expect(result.manual[0]!.suggestion).toBeDefined();
    });

    it("does not produce false fixes", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({ name: "test" }),
      );
      writeFileSync(
        join(projectRoot, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }),
      );
      writeFileSync(join(projectRoot, ".env.example"), "VAR=value\n");
      writeFileSync(join(projectRoot, ".env"), "VAR=my-actual-value\n");

      const result = autoFix(projectRoot);
      expect(result.autoFixed).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // detectAllIssues
  // -----------------------------------------------------------------------

  describe("detectAllIssues", () => {
    it("combines issues from all detectors", () => {
      // No package.json, no tsconfig, missing env, missing deps
      writeFileSync(
        join(projectRoot, ".env.example"),
        "SOME_VAR=val\n",
      );
      writeFileSync(join(projectRoot, "pnpm-lock.yaml"), "lockfileVersion: 6");

      const issues = detectAllIssues(projectRoot);
      // Should have: missing package.json + missing env var + missing deps
      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
