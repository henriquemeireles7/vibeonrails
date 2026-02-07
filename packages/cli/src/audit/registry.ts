/**
 * Audit Check Registry
 *
 * Central registry of all 172 checks. Provides filtering capabilities.
 */

import type { AuditCheck, AuditFilterOptions } from "./types.js";
import {
  top30Checks,
  securityChecks,
  performanceChecks,
  testingChecks,
  codeQualityChecks,
  errorHandlingChecks,
  architectureChecks,
  deploymentChecks,
  observabilityChecks,
  businessChecks,
  dataIntegrityChecks,
  uxChecks,
  complianceChecks,
  aiPatternsChecks,
} from "./checkers/index.js";

const ALL_CHECKS: AuditCheck[] = [
  ...top30Checks,
  ...securityChecks,
  ...performanceChecks,
  ...testingChecks,
  ...codeQualityChecks,
  ...errorHandlingChecks,
  ...architectureChecks,
  ...deploymentChecks,
  ...observabilityChecks,
  ...businessChecks,
  ...dataIntegrityChecks,
  ...uxChecks,
  ...complianceChecks,
  ...aiPatternsChecks,
];

export function getChecks(): AuditCheck[] {
  return ALL_CHECKS;
}

export function getAllCheckIds(): string[] {
  return ALL_CHECKS.map((c) => c.id);
}

export function filterChecks(options: AuditFilterOptions): AuditCheck[] {
  let checks = [...ALL_CHECKS];

  if (options.top30Only) {
    checks = checks.filter((c) => c.id.startsWith("TOP-"));
  }

  if (options.categories && options.categories.length > 0) {
    checks = checks.filter((c) => options.categories!.includes(c.category));
  }

  if (options.severities && options.severities.length > 0) {
    checks = checks.filter((c) => options.severities!.includes(c.severity));
  }

  if (options.ids && options.ids.length > 0) {
    checks = checks.filter((c) => options.ids!.includes(c.id));
  }

  if (options.excludeIds && options.excludeIds.length > 0) {
    checks = checks.filter((c) => !options.excludeIds!.includes(c.id));
  }

  if (options.automatableOnly) {
    checks = checks.filter((c) => c.automatable);
  }

  return checks;
}
