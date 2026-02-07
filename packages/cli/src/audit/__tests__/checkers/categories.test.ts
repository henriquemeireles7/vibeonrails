/**
 * Category structure tests
 *
 * Verifies each checker module exports the correct number of checks
 * with valid IDs and required metadata.
 */
import { describe, it, expect } from "vitest";
import { securityChecks } from "../../checkers/security.js";
import { performanceChecks } from "../../checkers/performance.js";
import { testingChecks } from "../../checkers/testing.js";
import { codeQualityChecks } from "../../checkers/code-quality.js";
import { errorHandlingChecks } from "../../checkers/error-handling.js";
import { architectureChecks } from "../../checkers/architecture.js";
import { deploymentChecks } from "../../checkers/deployment.js";
import { observabilityChecks } from "../../checkers/observability.js";
import { businessChecks } from "../../checkers/business.js";
import { dataIntegrityChecks } from "../../checkers/data-integrity.js";
import { uxChecks } from "../../checkers/ux.js";
import { complianceChecks } from "../../checkers/compliance.js";
import { aiPatternsChecks } from "../../checkers/ai-patterns.js";
import type { AuditCheck, AuditContext } from "../../types.js";

function mockContext(files: Record<string, string> = {}): AuditContext {
  const sourceFiles = Object.keys(files).filter(
    (f) => /\.(ts|tsx|js|jsx)$/.test(f) && !f.includes(".test."),
  );
  return {
    projectRoot: "/mock",
    sourceFiles,
    testFiles: [],
    allFiles: Object.keys(files),
    readFile: (p: string) => files[p] ?? "",
    fileExists: (p: string) => p in files,
    fileLines: (p: string) => (files[p] ?? "").split("\n"),
    packageJson: null,
  };
}

function validateChecks(
  checks: AuditCheck[],
  expectedCount: number,
  idPrefix: string,
  category: string,
) {
  it(`exports exactly ${expectedCount} checks`, () => {
    expect(checks).toHaveLength(expectedCount);
  });

  it(`all checks have ${idPrefix} prefix IDs`, () => {
    for (const check of checks) {
      expect(check.id).toMatch(new RegExp(`^${idPrefix}-\\d{3}$`));
    }
  });

  it(`all checks are in ${category} category`, () => {
    for (const check of checks) {
      expect(check.category).toBe(category);
    }
  });

  it("all checks have required metadata", () => {
    for (const check of checks) {
      expect(check.name).toBeTruthy();
      expect(check.description).toBeTruthy();
      expect(check.severity).toMatch(/^(critical|high|medium|low)$/);
      expect(typeof check.automatable).toBe("boolean");
      expect(typeof check.autoFixable).toBe("boolean");
      expect(typeof check.check).toBe("function");
    }
  });

  it("all checks return valid results", async () => {
    const ctx = mockContext();
    for (const check of checks) {
      const result = await check.check(ctx);
      expect(result.status).toMatch(/^(pass|fail|warn|skip)$/);
      expect(Array.isArray(result.findings)).toBe(true);
    }
  });
}

describe("security checks", () => {
  validateChecks(securityChecks, 15, "SEC", "security");
});

describe("performance checks", () => {
  validateChecks(performanceChecks, 15, "PERF", "performance");
});

describe("testing checks", () => {
  validateChecks(testingChecks, 12, "TEST", "testing");
});

describe("code-quality checks", () => {
  validateChecks(codeQualityChecks, 15, "CODE", "code-quality");
});

describe("error-handling checks", () => {
  validateChecks(errorHandlingChecks, 10, "ERR", "error-handling");
});

describe("architecture checks", () => {
  validateChecks(architectureChecks, 10, "ARCH", "architecture");
});

describe("deployment checks", () => {
  validateChecks(deploymentChecks, 7, "DEPLOY", "deployment");
});

describe("observability checks", () => {
  validateChecks(observabilityChecks, 8, "OBS", "observability");
});

describe("business checks", () => {
  validateChecks(businessChecks, 10, "BIZ", "business");
});

describe("data-integrity checks", () => {
  validateChecks(dataIntegrityChecks, 10, "DATA", "data-integrity");
});

describe("ux checks", () => {
  validateChecks(uxChecks, 10, "UX", "ux");
});

describe("compliance checks", () => {
  validateChecks(complianceChecks, 8, "PRIV", "compliance");
});

describe("ai-patterns checks", () => {
  validateChecks(aiPatternsChecks, 12, "AI", "ai-patterns");
});

// Representative functional tests for key automatable checks

describe("functional: code-quality CODE-001 file length", () => {
  const check = codeQualityChecks.find((c) => c.id === "CODE-001")!;

  it("detects files over 400 lines", async () => {
    const longFile = Array.from({ length: 450 }, (_, i) => `const x${i} = ${i};`).join("\n");
    const ctx = mockContext({ "src/big.ts": longFile });
    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
  });

  it("passes files under 400 lines", async () => {
    const ctx = mockContext({ "src/small.ts": "const x = 1;" });
    const result = await check.check(ctx);
    expect(result.status).toBe("pass");
  });
});

describe("functional: error-handling ERR-001 empty catch", () => {
  const check = errorHandlingChecks.find((c) => c.id === "ERR-001")!;

  it("detects empty catch blocks", async () => {
    const ctx = mockContext({
      "src/app.ts": "try { doSomething(); } catch (e) {}",
    });
    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
  });
});

describe("functional: ai-patterns AI-001 placeholder code", () => {
  const check = aiPatternsChecks.find((c) => c.id === "AI-001")!;

  it("detects TODO markers", async () => {
    const ctx = mockContext({
      "src/app.ts": "// TODO: implement this feature",
    });
    const result = await check.check(ctx);
    expect(result.status).toBe("fail");
  });
});
