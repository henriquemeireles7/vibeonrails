import { describe, it, expect } from "vitest";
import { runAuditChecks } from "../runner.js";
import type { AuditCheck, AuditContext, AuditCheckResult } from "../types.js";

function mockContext(): AuditContext {
  return {
    projectRoot: "/mock",
    sourceFiles: [],
    testFiles: [],
    allFiles: [],
    readFile: () => "",
    fileExists: () => false,
    fileLines: () => [],
    packageJson: null,
  };
}

function makeCheck(
  id: string,
  status: "pass" | "fail" | "warn" | "skip",
  severity: "critical" | "high" | "medium" | "low" = "medium",
): AuditCheck {
  return {
    id,
    name: `Check ${id}`,
    category: "top30",
    severity,
    description: `Description for ${id}`,
    automatable: status !== "skip",
    autoFixable: false,
    check: async () => ({
      status,
      findings:
        status === "fail"
          ? [{ file: "test.ts", message: `Failed ${id}` }]
          : [],
    }),
  };
}

describe("runAuditChecks", () => {
  it("runs all checks and collects results", async () => {
    const checks = [
      makeCheck("A", "pass"),
      makeCheck("B", "fail"),
      makeCheck("C", "skip"),
    ];

    const results = await runAuditChecks(checks, mockContext());

    expect(results).toHaveLength(3);
    expect(results[0]!.status).toBe("pass");
    expect(results[1]!.status).toBe("fail");
    expect(results[2]!.status).toBe("skip");
  });

  it("preserves check metadata in results", async () => {
    const checks = [makeCheck("X-001", "pass", "critical")];
    const results = await runAuditChecks(checks, mockContext());

    expect(results[0]!.id).toBe("X-001");
    expect(results[0]!.severity).toBe("critical");
    expect(results[0]!.name).toBe("Check X-001");
  });

  it("handles check errors gracefully", async () => {
    const errorCheck: AuditCheck = {
      id: "ERR",
      name: "Error Check",
      category: "top30",
      severity: "high",
      description: "This check throws",
      automatable: true,
      autoFixable: false,
      check: async () => {
        throw new Error("boom");
      },
    };

    const results = await runAuditChecks([errorCheck], mockContext());

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("warn");
    expect(results[0]!.findings[0]!.message).toContain("boom");
  });

  it("returns empty results for empty check list", async () => {
    const results = await runAuditChecks([], mockContext());
    expect(results).toEqual([]);
  });
});
