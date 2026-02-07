/**
 * Audit Scorer
 *
 * Calculates weighted audit scores and builds the final report.
 */

import type {
  AuditCheckResult,
  AuditReport,
  Severity,
} from "./types.js";
import { SEVERITY_WEIGHT } from "./types.js";

const WARN_FACTOR = 0.5;

export function calculateScore(results: AuditCheckResult[]): number {
  const scorable = results.filter((r) => r.status !== "skip");

  if (scorable.length === 0) return 100;

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const result of scorable) {
    const weight = SEVERITY_WEIGHT[result.severity];
    totalWeight += weight;

    if (result.status === "pass") {
      earnedWeight += weight;
    } else if (result.status === "warn") {
      earnedWeight += weight * WARN_FACTOR;
    }
    // fail = 0 earned
  }

  if (totalWeight === 0) return 100;

  return Math.round((earnedWeight / totalWeight) * 100);
}

export function buildReport(
  results: AuditCheckResult[],
  projectRoot: string,
): AuditReport {
  return {
    timestamp: new Date().toISOString(),
    projectRoot,
    totalChecks: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    warned: results.filter((r) => r.status === "warn").length,
    skipped: results.filter((r) => r.status === "skip").length,
    score: calculateScore(results),
    results,
  };
}
