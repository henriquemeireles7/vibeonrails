/**
 * Observability & Monitoring (OBS-001 through OBS-008)
 *
 * From vibeaudit.md: You can't fix what you can't see.
 */

import type { AuditCheck } from "../types.js";
import { configCheck, manualCheck } from "../helpers.js";

export const observabilityChecks: AuditCheck[] = [
  // OBS-001: Uptime Monitoring
  manualCheck({
    id: "OBS-001",
    name: "Uptime Monitoring",
    category: "observability",
    severity: "critical",
    description: "External service pings your app every 1-5 minutes and alerts when down.",
  }),

  // OBS-002: Error Tracking Service
  configCheck({
    id: "OBS-002",
    name: "Error Tracking Service",
    category: "observability",
    severity: "high",
    description: "Sentry, LogRocket, or equivalent captures production errors.",
    validate: (ctx) => {
      const pkg = ctx.packageJson;
      if (!pkg) return [];
      const deps = { ...(pkg.dependencies as Record<string, string> | undefined) };
      const trackers = ["@sentry/node", "@sentry/react", "@sentry/nextjs", "logrocket", "bugsnag", "rollbar", "datadog"];
      if (trackers.some((t) => t in deps)) return [];
      const hasTracker = ctx.sourceFiles.some((f) => /sentry|logrocket|bugsnag|rollbar|datadog/i.test(ctx.readFile(f)));
      if (hasTracker) return [];
      return [{ file: "", message: "No error tracking service detected", suggestion: "Add Sentry or equivalent for production error tracking" }];
    },
  }),

  // OBS-003: Payment Event Monitoring
  manualCheck({
    id: "OBS-003",
    name: "Payment Event Monitoring",
    category: "observability",
    severity: "critical",
    description: "Failed payments, subscription changes, and webhook failures are tracked.",
  }),

  // OBS-004: Basic Performance Metrics
  manualCheck({
    id: "OBS-004",
    name: "Basic Performance Metrics",
    category: "observability",
    severity: "medium",
    description: "You know your P95 API response time, page load time, and error rate.",
  }),

  // OBS-005: Log Retention
  manualCheck({
    id: "OBS-005",
    name: "Log Retention",
    category: "observability",
    severity: "medium",
    description: "Production logs retained for at least 30 days.",
  }),

  // OBS-006: Database Performance Visibility
  manualCheck({
    id: "OBS-006",
    name: "Database Performance Visibility",
    category: "observability",
    severity: "medium",
    description: "Slow queries are identifiable via dashboard or slow query log.",
  }),

  // OBS-007: Resource Usage Awareness
  manualCheck({
    id: "OBS-007",
    name: "Resource Usage Awareness",
    category: "observability",
    severity: "medium",
    description: "You know current CPU, memory, and DB connection usage relative to plan limits.",
  }),

  // OBS-008: Alerting Doesn't Cry Wolf
  manualCheck({
    id: "OBS-008",
    name: "Alerting Doesn't Cry Wolf",
    category: "observability",
    severity: "medium",
    description: "Alerts fire on real problems, not transient blips.",
  }),
];
