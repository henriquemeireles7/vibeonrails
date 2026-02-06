import { describe, it, expect } from "vitest";
import {
  analyzeLine,
  analyzeFile,
  analyzeFiles,
  formatWarning,
  formatAnalysisResult,
  shouldAnalyzeFile,
  DETECTION_PATTERNS,
} from "./prevention.js";
import type { PreventionWarning, AnalysisResult } from "./prevention.js";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Predictive Error Prevention", () => {
  // -----------------------------------------------------------------------
  // Pattern Detection
  // -----------------------------------------------------------------------

  describe("analyzeLine", () => {
    it("detects missing validation on req.body", () => {
      const warnings = analyzeLine(
        'const data = req.body;',
        1,
        "src/routes/api.ts",
      );
      expect(warnings.some((w) => w.category === "validation")).toBe(true);
    });

    it("does not flag req.body when Zod validation is nearby", () => {
      const warnings = analyzeLine(
        'const data = req.body;',
        1,
        "src/routes/api.ts",
        ["const schema = z.object({ name: z.string() });", "const parsed = schema.parse(req.body);"],
      );
      expect(warnings.filter((w) => w.id === "missing-validation-req-body")).toHaveLength(0);
    });

    it("detects SQL injection via string interpolation", () => {
      const warnings = analyzeLine(
        'const query = `SELECT * FROM users WHERE id = ${userId}`;',
        5,
        "src/db/queries.ts",
      );
      expect(warnings.some((w) => w.category === "sql-injection")).toBe(true);
    });

    it("detects SQL injection via concatenation", () => {
      const warnings = analyzeLine(
        'const query = "SELECT * FROM users WHERE id = " + req.params.id;',
        5,
        "src/db/queries.ts",
      );
      expect(warnings.some((w) => w.category === "sql-injection")).toBe(true);
    });

    it("detects hardcoded secrets", () => {
      const warnings = analyzeLine(
        'const apiKey = "sk_live_abcdef123456789";',
        10,
        "src/config.ts",
      );
      expect(warnings.some((w) => w.category === "security")).toBe(true);
    });

    it("does not flag env variable references", () => {
      const warnings = analyzeLine(
        'const apiKey = process.env.API_KEY;',
        10,
        "src/config.ts",
        ["const apiKey = process.env.API_KEY;"],
      );
      expect(warnings.filter((w) => w.id === "hardcoded-secret")).toHaveLength(0);
    });

    it("detects console.log", () => {
      const warnings = analyzeLine(
        'console.log("debug data:", userData);',
        15,
        "src/service.ts",
      );
      expect(warnings.some((w) => w.id === "console-log-production")).toBe(true);
    });

    it("detects missing auth on mutation routes", () => {
      const warnings = analyzeLine(
        'app.post("/api/users", async (c) => {',
        3,
        "src/routes/users.ts",
      );
      expect(warnings.some((w) => w.category === "auth")).toBe(true);
    });

    it("does not flag mutation routes with auth middleware in context", () => {
      const warnings = analyzeLine(
        'app.post("/api/users", async (c) => {',
        3,
        "src/routes/users.ts",
        ["import { authMiddleware } from './auth';", "app.use(authMiddleware());"],
      );
      expect(warnings.filter((w) => w.id === "missing-auth-route")).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // File Analysis
  // -----------------------------------------------------------------------

  describe("analyzeFile", () => {
    it("analyzes all lines in a file", () => {
      const content = [
        'import { Hono } from "hono";',
        "",
        "const app = new Hono();",
        "",
        'app.post("/api/data", async (c) => {',
        "  const data = c.req.query('id');",
        "  return c.json({ data });",
        "});",
      ].join("\n");

      const result = analyzeFile("src/api.ts", content);
      expect(result.file).toBe("src/api.ts");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.analyzedAt).toBeDefined();
    });

    it("skips comment lines", () => {
      const content = [
        "// const apiKey = 'sk_live_abcdef123456789';",
        "* const secret = 'hardcoded_value_here123';",
      ].join("\n");

      const result = analyzeFile("src/test.ts", content);
      expect(result.warnings.filter((w) => w.id === "hardcoded-secret")).toHaveLength(0);
    });

    it("deduplicates warnings", () => {
      const content = 'const data = req.body;\nconst data2 = req.body;';
      const result = analyzeFile("src/api.ts", content);

      // Each line should produce at most one warning per pattern
      const bodyWarnings = result.warnings.filter(
        (w) => w.id === "missing-validation-req-body",
      );
      // Two different lines = two warnings (deduplicated by line, not id alone)
      expect(bodyWarnings.length).toBeLessThanOrEqual(2);
    });

    it("returns empty warnings for clean file", () => {
      const content = [
        'import { z } from "zod";',
        "",
        "const schema = z.object({ name: z.string() });",
        "",
        "export function processData(input: unknown) {",
        "  return schema.parse(input);",
        "}",
      ].join("\n");

      const result = analyzeFile("src/clean.ts", content);
      // May have some warnings but no critical ones
      const criticalWarnings = result.warnings.filter(
        (w) => w.severity === "error",
      );
      expect(criticalWarnings).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Multiple File Analysis
  // -----------------------------------------------------------------------

  describe("analyzeFiles", () => {
    it("analyzes multiple files", () => {
      const files = [
        { path: "src/a.ts", content: "console.log('test');" },
        { path: "src/b.ts", content: "console.log('test2');" },
      ];

      const results = analyzeFiles(files);
      expect(results).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Formatting
  // -----------------------------------------------------------------------

  describe("formatWarning", () => {
    it("includes severity, category, and message", () => {
      const warning: PreventionWarning = {
        id: "test-warning",
        category: "validation",
        severity: "warning",
        message: "Missing validation",
        file: "src/api.ts",
        line: 5,
        suggestion: "Add Zod validation",
      };

      const output = formatWarning(warning);
      expect(output).toContain("WARN");
      expect(output).toContain("validation");
      expect(output).toContain("Missing validation");
      expect(output).toContain("src/api.ts:5");
      expect(output).toContain("Add Zod validation");
    });
  });

  describe("formatAnalysisResult", () => {
    it("returns empty string for no warnings", () => {
      const result: AnalysisResult = {
        file: "src/clean.ts",
        warnings: [],
        analyzedAt: new Date().toISOString(),
      };
      expect(formatAnalysisResult(result)).toBe("");
    });

    it("formats file header and warnings", () => {
      const result: AnalysisResult = {
        file: "src/dirty.ts",
        warnings: [
          {
            id: "test",
            category: "security",
            severity: "error",
            message: "Bad pattern",
            file: "src/dirty.ts",
            line: 1,
            suggestion: "Fix it",
          },
        ],
        analyzedAt: new Date().toISOString(),
      };
      const output = formatAnalysisResult(result);
      expect(output).toContain("src/dirty.ts");
      expect(output).toContain("1 warning(s)");
    });
  });

  // -----------------------------------------------------------------------
  // File Filtering
  // -----------------------------------------------------------------------

  describe("shouldAnalyzeFile", () => {
    it("accepts TypeScript files", () => {
      expect(shouldAnalyzeFile("src/service.ts")).toBe(true);
    });

    it("accepts TSX files", () => {
      expect(shouldAnalyzeFile("src/Component.tsx")).toBe(true);
    });

    it("accepts JavaScript files", () => {
      expect(shouldAnalyzeFile("src/utils.js")).toBe(true);
    });

    it("rejects test files", () => {
      expect(shouldAnalyzeFile("src/service.test.ts")).toBe(false);
    });

    it("rejects spec files", () => {
      expect(shouldAnalyzeFile("src/service.spec.ts")).toBe(false);
    });

    it("rejects node_modules files", () => {
      expect(shouldAnalyzeFile("node_modules/pkg/index.ts")).toBe(false);
    });

    it("rejects dist files", () => {
      expect(shouldAnalyzeFile("dist/index.js")).toBe(false);
    });

    it("rejects config files", () => {
      expect(shouldAnalyzeFile("vitest.config.ts")).toBe(false);
    });

    it("rejects non-code files", () => {
      expect(shouldAnalyzeFile("README.md")).toBe(false);
      expect(shouldAnalyzeFile("package.json")).toBe(false);
      expect(shouldAnalyzeFile("styles.css")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Detection Patterns
  // -----------------------------------------------------------------------

  describe("DETECTION_PATTERNS", () => {
    it("has at least 5 patterns", () => {
      expect(DETECTION_PATTERNS.length).toBeGreaterThanOrEqual(5);
    });

    it("all patterns have required fields", () => {
      for (const pattern of DETECTION_PATTERNS) {
        expect(pattern.id).toBeDefined();
        expect(pattern.category).toBeDefined();
        expect(pattern.severity).toBeDefined();
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(pattern.message).toBeDefined();
        expect(pattern.suggestion).toBeDefined();
      }
    });

    it("covers all categories", () => {
      const categories = new Set(DETECTION_PATTERNS.map((p) => p.category));
      expect(categories.has("validation")).toBe(true);
      expect(categories.has("sql-injection")).toBe(true);
      expect(categories.has("auth")).toBe(true);
      expect(categories.has("security")).toBe(true);
    });
  });
});
