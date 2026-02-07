/**
 * Audit Runner
 *
 * Executes audit checks against a project context and collects results.
 */

import type { AuditCheck, AuditCheckResult, AuditContext } from "./types.js";

export async function runAuditChecks(
  checks: AuditCheck[],
  ctx: AuditContext,
): Promise<AuditCheckResult[]> {
  const results: AuditCheckResult[] = [];

  for (const check of checks) {
    try {
      const result = await check.check(ctx);
      results.push({
        id: check.id,
        name: check.name,
        category: check.category,
        severity: check.severity,
        description: check.description,
        automatable: check.automatable,
        autoFixable: check.autoFixable,
        status: result.status,
        findings: result.findings,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      results.push({
        id: check.id,
        name: check.name,
        category: check.category,
        severity: check.severity,
        description: check.description,
        automatable: check.automatable,
        autoFixable: check.autoFixable,
        status: "warn",
        findings: [
          {
            file: "",
            message: `Check failed to execute: ${message}`,
          },
        ],
      });
    }
  }

  return results;
}
