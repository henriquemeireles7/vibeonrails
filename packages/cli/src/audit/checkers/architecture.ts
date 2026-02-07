/**
 * Architecture & Patterns (ARCH-001 through ARCH-010)
 *
 * From vibeaudit.md: Keep it simple, keep it working, keep it changeable.
 */

import type { AuditCheck } from "../types.js";
import { patternCheck, configCheck, manualCheck } from "../helpers.js";

export const architectureChecks: AuditCheck[] = [
  // ARCH-001: Single Database, Single Framework
  configCheck({
    id: "ARCH-001",
    name: "Single Database, Single Framework",
    category: "architecture",
    severity: "high",
    description: "Not running 3 databases and 2 frameworks for a $30k/month app.",
    validate: (ctx) => {
      const pkg = ctx.packageJson;
      if (!pkg) return [];
      const deps = { ...(pkg.dependencies as Record<string, string> | undefined) };
      const dbs = ["pg", "mysql2", "mongodb", "better-sqlite3", "redis", "@prisma/client", "drizzle-orm", "mongoose", "typeorm", "sequelize"].filter((d) => d in deps);
      if (dbs.length > 3) {
        return [{ file: "package.json", message: `Multiple database drivers found (${dbs.join(", ")})`, suggestion: "Consolidate to one primary database" }];
      }
      return [];
    },
  }),

  // ARCH-002: No Circular Dependencies
  manualCheck({
    id: "ARCH-002",
    name: "No Circular Dependencies",
    category: "architecture",
    severity: "medium",
    description: "Module A doesn't import B which imports C which imports A.",
  }),

  // ARCH-003: API Contract Consistency
  manualCheck({
    id: "ARCH-003",
    name: "API Contract Consistency",
    category: "architecture",
    severity: "medium",
    description: "All API endpoints follow the same response structure.",
  }),

  // ARCH-004: Business Logic Not in UI Components
  patternCheck({
    id: "ARCH-004",
    name: "Business Logic Not in UI Components",
    category: "architecture",
    severity: "high",
    description: "Pricing calculations and access rules live in service files, not React components.",
    pattern: /(?:price|discount|tax|total|billing)\s*(?:=|:)\s*(?:props\.|useState)/i,
    fileFilter: (f) => f.endsWith(".tsx") || f.endsWith(".jsx"),
    message: "Business logic (pricing/billing) may be inline in UI component",
    suggestion: "Move business logic to service/utility files",
  }),

  // ARCH-005: Database Schema Matches Domain
  configCheck({
    id: "ARCH-005",
    name: "Database Schema Matches Domain",
    category: "architecture",
    severity: "medium",
    description: "Table names reflect business concepts, not tbl_sub_01. Foreign keys enforced.",
    validate: (ctx) => {
      const schemaFiles = ctx.sourceFiles.filter((f) => f.includes("schema"));
      if (schemaFiles.length === 0) return [];
      for (const file of schemaFiles) {
        const content = ctx.readFile(file);
        if (/tbl_|table_\d|t_\d/i.test(content)) {
          return [{ file, message: "Schema uses non-descriptive table names", suggestion: "Use business-domain table names (users, subscriptions, etc.)" }];
        }
      }
      return [];
    },
  }),

  // ARCH-006: Configuration is Centralized
  configCheck({
    id: "ARCH-006",
    name: "Configuration is Centralized",
    category: "architecture",
    severity: "medium",
    description: "App config lives in one place, not scattered across 20 files.",
    validate: (ctx) => {
      const configFiles = ctx.allFiles.filter((f) => /config\.(ts|js|json|yaml|yml)$/i.test(f));
      if (configFiles.length > 0) return [];
      const hasEnv = ctx.fileExists(".env") || ctx.fileExists(".env.example");
      if (hasEnv) return [];
      return [{ file: "", message: "No centralized configuration file detected", suggestion: "Create a config file to centralize app settings" }];
    },
  }),

  // ARCH-007: Stateless Application Layer
  patternCheck({
    id: "ARCH-007",
    name: "Stateless Application Layer",
    category: "architecture",
    severity: "medium",
    description: "App server holds no in-memory state between requests.",
    pattern: /(?:global\.|globalThis\.)\w+\s*=\s*(?!undefined)/,
    fileFilter: (f) => f.includes("server") || f.includes("app") || f.includes("handler"),
    message: "Global mutable state in application server",
    suggestion: "Use external storage (Redis, DB) instead of in-memory state",
  }),

  // ARCH-008: Third-Party Services Abstracted
  manualCheck({
    id: "ARCH-008",
    name: "Third-Party Services Abstracted",
    category: "architecture",
    severity: "medium",
    description: "Stripe, email, SMS accessed through wrapper/service layer.",
  }),

  // ARCH-009: No Premature Optimization
  manualCheck({
    id: "ARCH-009",
    name: "No Premature Optimization",
    category: "architecture",
    severity: "medium",
    description: "No Redis caching, message queues, or microservices before proving they're needed.",
  }),

  // ARCH-010: Feature Flags for Risky Changes
  configCheck({
    id: "ARCH-010",
    name: "Feature Flags for Risky Changes",
    category: "architecture",
    severity: "medium",
    description: "New features can be toggled on/off without a deploy.",
    validate: (ctx) => {
      const hasFlags = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /featureFlag|feature_flag|FEATURE_|isEnabled|launchdarkly|flipt|unleash/i.test(content);
      });
      if (hasFlags) return [];
      return [];
    },
  }),
];
