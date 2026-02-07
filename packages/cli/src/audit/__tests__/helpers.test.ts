import { describe, it, expect } from "vitest";
import {
  patternCheck,
  missingPatternCheck,
  fileExistsCheck,
  configCheck,
  manualCheck,
} from "../helpers.js";
import type { AuditContext } from "../types.js";

// ---------------------------------------------------------------------------
// Mock Context Builder
// ---------------------------------------------------------------------------

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
  const allFiles = Object.keys(files);

  return {
    projectRoot: "/mock",
    sourceFiles,
    testFiles,
    allFiles,
    readFile: (path: string) => files[path] ?? "",
    fileExists: (path: string) => path in files,
    fileLines: (path: string) => (files[path] ?? "").split("\n"),
    packageJson: opts?.packageJson ?? null,
  };
}

// ---------------------------------------------------------------------------
// patternCheck
// ---------------------------------------------------------------------------

describe("patternCheck", () => {
  it("fails when pattern is found in source files", async () => {
    const check = patternCheck({
      id: "TEST-001",
      name: "Test Check",
      category: "security",
      severity: "critical",
      description: "Test",
      pattern: /console\.log/,
      message: "Found console.log",
    });

    const ctx = mockContext({
      "src/app.ts": "const x = 1;\nconsole.log(x);\nconst y = 2;",
    });

    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.file).toBe("src/app.ts");
    expect(result.findings[0]!.line).toBe(2);
  });

  it("passes when pattern is not found", async () => {
    const check = patternCheck({
      id: "TEST-001",
      name: "Test Check",
      category: "security",
      severity: "critical",
      description: "Test",
      pattern: /console\.log/,
      message: "Found console.log",
    });

    const ctx = mockContext({
      "src/app.ts": "const x = 1;\nconst y = 2;",
    });

    const result = await check.check(ctx);
    expect(result.status).toBe("pass");
    expect(result.findings).toHaveLength(0);
  });

  it("respects file filter", async () => {
    const check = patternCheck({
      id: "TEST-001",
      name: "Test Check",
      category: "security",
      severity: "critical",
      description: "Test",
      pattern: /bad_pattern/,
      message: "Found bad pattern",
      fileFilter: (f) => f.endsWith(".tsx"),
    });

    const ctx = mockContext({
      "src/app.ts": "bad_pattern here",
      "src/comp.tsx": "clean code",
    });

    const result = await check.check(ctx);
    expect(result.status).toBe("pass");
  });

  it("finds multiple occurrences across files", async () => {
    const check = patternCheck({
      id: "TEST-001",
      name: "Test Check",
      category: "security",
      severity: "critical",
      description: "Test",
      pattern: /TODO/,
      message: "Found TODO",
    });

    const ctx = mockContext({
      "src/a.ts": "// TODO: fix this",
      "src/b.ts": "// TODO: also this\n// TODO: and this",
    });

    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
    expect(result.findings).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// missingPatternCheck
// ---------------------------------------------------------------------------

describe("missingPatternCheck", () => {
  it("fails when required pattern is missing from files", async () => {
    const check = missingPatternCheck({
      id: "TEST-002",
      name: "Test Missing",
      category: "security",
      severity: "high",
      description: "Test",
      pattern: /\.limit\(/,
      fileFilter: (f) => f.includes("repo"),
      message: "Missing .limit() on query",
    });

    const ctx = mockContext({
      "src/user.repo.ts": "const users = await db.select().from(usersTable);",
    });

    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
    expect(result.findings).toHaveLength(1);
  });

  it("passes when required pattern is present", async () => {
    const check = missingPatternCheck({
      id: "TEST-002",
      name: "Test Missing",
      category: "security",
      severity: "high",
      description: "Test",
      pattern: /\.limit\(/,
      fileFilter: (f) => f.includes("repo"),
      message: "Missing .limit() on query",
    });

    const ctx = mockContext({
      "src/user.repo.ts": "const users = await db.select().from(usersTable).limit(50);",
    });

    const result = await check.check(ctx);
    expect(result.status).toBe("pass");
  });

  it("skips when no files match filter", async () => {
    const check = missingPatternCheck({
      id: "TEST-002",
      name: "Test Missing",
      category: "security",
      severity: "high",
      description: "Test",
      pattern: /\.limit\(/,
      fileFilter: (f) => f.includes("repo"),
      message: "Missing .limit() on query",
    });

    const ctx = mockContext({
      "src/app.ts": "const x = 1;",
    });

    const result = await check.check(ctx);
    expect(result.status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// fileExistsCheck
// ---------------------------------------------------------------------------

describe("fileExistsCheck", () => {
  it("passes when required files exist", async () => {
    const check = fileExistsCheck({
      id: "TEST-003",
      name: "README Exists",
      category: "code-quality",
      severity: "medium",
      description: "Test",
      files: ["README.md"],
      message: "Missing README.md",
    });

    const ctx = mockContext({ "README.md": "# Hello" });
    const result = await check.check(ctx);
    expect(result.status).toBe("pass");
  });

  it("fails when required files are missing", async () => {
    const check = fileExistsCheck({
      id: "TEST-003",
      name: "README Exists",
      category: "code-quality",
      severity: "medium",
      description: "Test",
      files: ["README.md", ".env.example"],
      message: "Missing required file",
    });

    const ctx = mockContext({ "src/app.ts": "x" });
    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
    expect(result.findings).toHaveLength(2);
  });

  it("checks content patterns when specified", async () => {
    const check = fileExistsCheck({
      id: "TEST-003",
      name: "README Complete",
      category: "code-quality",
      severity: "medium",
      description: "Test",
      files: ["README.md"],
      contentPatterns: [/## Installation/, /## Usage/],
      message: "README missing sections",
    });

    const ctx = mockContext({ "README.md": "# App\n## Installation\nRun npm install" });
    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
    expect(result.findings[0]!.message).toContain("Usage");
  });
});

// ---------------------------------------------------------------------------
// configCheck
// ---------------------------------------------------------------------------

describe("configCheck", () => {
  it("passes when config validator returns no findings", async () => {
    const check = configCheck({
      id: "TEST-004",
      name: "Config OK",
      category: "security",
      severity: "high",
      description: "Test",
      validate: (ctx) => {
        const pkg = ctx.packageJson;
        if (pkg && (pkg as Record<string, unknown>).name) return [];
        return [{ file: "package.json", message: "Missing name" }];
      },
    });

    const ctx = mockContext({}, { packageJson: { name: "app" } });
    const result = await check.check(ctx);
    expect(result.status).toBe("pass");
  });

  it("fails when config validator returns findings", async () => {
    const check = configCheck({
      id: "TEST-004",
      name: "Config OK",
      category: "security",
      severity: "high",
      description: "Test",
      validate: () => [{ file: "package.json", message: "Bad config" }],
    });

    const ctx = mockContext({});
    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
    expect(result.findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// manualCheck
// ---------------------------------------------------------------------------

describe("manualCheck", () => {
  it("always returns skip status", async () => {
    const check = manualCheck({
      id: "TEST-005",
      name: "Manual Test",
      category: "top30",
      severity: "critical",
      description: "Requires manual verification",
    });

    const ctx = mockContext({});
    const result = await check.check(ctx);
    expect(result.status).toBe("skip");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.message).toContain("Manual verification");
    expect(check.automatable).toBe(false);
  });
});
