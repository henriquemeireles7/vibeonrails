/**
 * Compliance & Privacy (PRIV-001 through PRIV-008)
 *
 * From vibeaudit.md: Legal requirements for LGPD/GDPR/CCPA.
 */

import type { AuditCheck } from "../types.js";
import { configCheck, manualCheck } from "../helpers.js";

export const complianceChecks: AuditCheck[] = [
  // PRIV-001: Privacy Policy Exists
  configCheck({
    id: "PRIV-001",
    name: "Privacy Policy Exists and Is Linked",
    category: "compliance",
    severity: "high",
    description: "Clear privacy policy accessible from every page.",
    validate: (ctx) => {
      const hasPrivacy = ctx.allFiles.some((f) => /privacy/i.test(f));
      if (hasPrivacy) return [];
      const hasPrivacyRef = ctx.sourceFiles.some((f) => /privacy.*policy|privacyPolicy/i.test(ctx.readFile(f)));
      if (hasPrivacyRef) return [];
      return [{ file: "", message: "No privacy policy file or reference detected", suggestion: "Create a privacy policy page accessible from footer" }];
    },
  }),

  // PRIV-002: Cookie Consent
  configCheck({
    id: "PRIV-002",
    name: "Cookie Consent Implemented",
    category: "compliance",
    severity: "medium",
    description: "Consent banner shown for tracking cookies. Users can opt out.",
    validate: (ctx) => {
      const hasCookieConsent = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /cookie.*consent|cookieConsent|gdpr.*cookie|cookie.*banner/i.test(content);
      });
      if (hasCookieConsent) return [];
      return [];
    },
  }),

  // PRIV-003: Data Collection Minimized
  manualCheck({
    id: "PRIV-003",
    name: "Data Collection is Minimized",
    category: "compliance",
    severity: "medium",
    description: "Only collect personal data you actually need.",
  }),

  // PRIV-004: PII Not in Logs
  configCheck({
    id: "PRIV-004",
    name: "PII Not in Logs or Analytics",
    category: "compliance",
    severity: "high",
    description: "User emails, names, IP addresses not logged in plain text.",
    validate: (ctx) => {
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      for (const file of ctx.sourceFiles) {
        const content = ctx.readFile(file);
        if (/console\.log\s*\([^)]*(?:email|name|address|phone|ssn|ip)\b/i.test(content)) {
          findings.push({ file, message: "PII may be logged in plain text", suggestion: "Redact PII before logging" });
        }
      }
      return findings;
    },
  }),

  // PRIV-005: Third-Party Data Sharing Documented
  manualCheck({
    id: "PRIV-005",
    name: "Third-Party Data Sharing Documented",
    category: "compliance",
    severity: "medium",
    description: "You know which third-party services receive user data.",
  }),

  // PRIV-006: Right to Deletion
  configCheck({
    id: "PRIV-006",
    name: "Right to Deletion Implementable",
    category: "compliance",
    severity: "medium",
    description: "If user requests deletion, you can fully delete their PII.",
    validate: (ctx) => {
      const hasDeletion = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /delete.*account|account.*delet|anonymize|gdpr.*delete|right.*forgotten/i.test(content);
      });
      if (hasDeletion) return [];
      return [];
    },
  }),

  // PRIV-007: Data Processing Agreement
  manualCheck({
    id: "PRIV-007",
    name: "Data Processing Agreement with Providers",
    category: "compliance",
    severity: "low",
    description: "Hosting, database, and email providers have DPAs.",
  }),

  // PRIV-008: Terms of Service Exist
  configCheck({
    id: "PRIV-008",
    name: "Terms of Service Exist",
    category: "compliance",
    severity: "high",
    description: "Users agree to ToS during signup covering acceptable use and cancellation.",
    validate: (ctx) => {
      const hasTos = ctx.allFiles.some((f) => /terms|tos/i.test(f));
      if (hasTos) return [];
      const hasTosRef = ctx.sourceFiles.some((f) => /terms.*service|termsOfService/i.test(ctx.readFile(f)));
      if (hasTosRef) return [];
      return [{ file: "", message: "No terms of service detected", suggestion: "Create ToS page users agree to during signup" }];
    },
  }),
];
