import { describe, it, expect } from "vitest";
import { top30Checks } from "../../checkers/top30.js";
import type { AuditContext } from "../../types.js";

function mockContext(
  files: Record<string, string>,
  opts?: { packageJson?: Record<string, unknown> },
): AuditContext {
  const sourceFiles = Object.keys(files).filter(
    (f) =>
      /\.(ts|tsx|js|jsx)$/.test(f) &&
      !f.includes(".test.") &&
      !f.includes(".spec."),
  );
  const testFiles = Object.keys(files).filter(
    (f) => f.includes(".test.") || f.includes(".spec."),
  );
  return {
    projectRoot: "/mock",
    sourceFiles,
    testFiles,
    allFiles: Object.keys(files),
    readFile: (path: string) => files[path] ?? "",
    fileExists: (path: string) => path in files,
    fileLines: (path: string) => (files[path] ?? "").split("\n"),
    packageJson: opts?.packageJson ?? null,
  };
}

describe("top30 checks", () => {
  it("exports exactly 30 checks", () => {
    expect(top30Checks).toHaveLength(30);
  });

  it("all checks have TOP- prefix IDs", () => {
    for (const check of top30Checks) {
      expect(check.id).toMatch(/^TOP-\d{3}$/);
    }
  });

  it("all checks are in top30 category", () => {
    for (const check of top30Checks) {
      expect(check.category).toBe("top30");
    }
  });

  // TOP-003: No Hardcoded Secrets
  describe("TOP-003", () => {
    const check = top30Checks.find((c) => c.id === "TOP-003")!;

    it("detects hardcoded API keys", async () => {
      const ctx = mockContext({
        "src/config.ts": 'const API_KEY = "sk_live_abc123def456ghi789";',
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("fail");
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it("passes clean code", async () => {
      const ctx = mockContext({
        "src/config.ts": "const API_KEY = process.env.API_KEY;",
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("pass");
    });
  });

  // TOP-006: SQL Injection Prevention
  describe("TOP-006", () => {
    const check = top30Checks.find((c) => c.id === "TOP-006")!;

    it("detects raw SQL with template literals", async () => {
      const ctx = mockContext({
        "src/db.ts": "const result = db.execute(`SELECT * FROM users WHERE id = ${userId}`);",
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("fail");
    });

    it("passes parameterized queries", async () => {
      const ctx = mockContext({
        "src/db.ts": "const result = await db.select().from(users).where(eq(users.id, userId));",
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("pass");
    });
  });

  // TOP-010: XSS Prevention
  describe("TOP-010", () => {
    const check = top30Checks.find((c) => c.id === "TOP-010")!;

    it("detects dangerouslySetInnerHTML", async () => {
      const ctx = mockContext({
        "src/component.tsx": '<div dangerouslySetInnerHTML={{ __html: userInput }} />',
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("fail");
    });

    it("passes safe rendering", async () => {
      const ctx = mockContext({
        "src/component.tsx": "<div>{userInput}</div>",
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("pass");
    });
  });

  // TOP-021: No console.log Sensitive Data
  describe("TOP-021", () => {
    const check = top30Checks.find((c) => c.id === "TOP-021")!;

    it("detects console.log with sensitive keywords", async () => {
      const ctx = mockContext({
        "src/auth.ts": 'console.log("token:", authToken);',
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("fail");
    });
  });

  // TOP-025: CORS Not Wildcard
  describe("TOP-025", () => {
    const check = top30Checks.find((c) => c.id === "TOP-025")!;

    it("detects wildcard CORS origin", async () => {
      const ctx = mockContext({
        "src/server.ts": "cors({ origin: '*' })",
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("fail");
    });

    it("passes specific CORS origin", async () => {
      const ctx = mockContext({
        "src/server.ts": "cors({ origin: 'https://myapp.com' })",
      });
      const result = await check.check(ctx);
      expect(result.status).toBe("pass");
    });
  });

  // TOP-027: README Works
  describe("TOP-027", () => {
    const check = top30Checks.find((c) => c.id === "TOP-027")!;

    it("fails when README.md is missing", async () => {
      const ctx = mockContext({ "src/app.ts": "x" });
      const result = await check.check(ctx);
      expect(result.status).toBe("fail");
    });

    it("passes when README.md exists", async () => {
      const ctx = mockContext({ "README.md": "# My App\n## Setup\nRun npm install" });
      const result = await check.check(ctx);
      expect(result.status).toBe("pass");
    });
  });
});
