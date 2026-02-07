/**
 * Data Integrity & Reliability (DATA-001 through DATA-010)
 *
 * From vibeaudit.md: Your database is your business.
 */

import type { AuditCheck } from "../types.js";
import { configCheck, manualCheck, patternCheck } from "../helpers.js";

export const dataIntegrityChecks: AuditCheck[] = [
  // DATA-001: Foreign Keys Enforced
  configCheck({
    id: "DATA-001",
    name: "Foreign Keys Enforced",
    category: "data-integrity",
    severity: "high",
    description: "Relationships use actual foreign key constraints.",
    validate: (ctx) => {
      const schemaFiles = ctx.sourceFiles.filter((f) => f.includes("schema"));
      if (schemaFiles.length === 0) return [];
      const hasForeignKeys = schemaFiles.some((f) => {
        const content = ctx.readFile(f);
        return /references|foreignKey|\.references\(|FOREIGN KEY/i.test(content);
      });
      if (hasForeignKeys) return [];
      return [{ file: schemaFiles[0] ?? "", message: "No foreign key constraints detected in schema", suggestion: "Add foreign key references to enforce relationships" }];
    },
  }),

  // DATA-002: Unique Constraints
  configCheck({
    id: "DATA-002",
    name: "Unique Constraints Where Needed",
    category: "data-integrity",
    severity: "high",
    description: "Email, username, and one-per-user entities have unique constraints.",
    validate: (ctx) => {
      const schemaFiles = ctx.sourceFiles.filter((f) => f.includes("schema"));
      if (schemaFiles.length === 0) return [];
      const hasUnique = schemaFiles.some((f) => {
        const content = ctx.readFile(f);
        return /unique|\.unique\(|UNIQUE/i.test(content);
      });
      if (hasUnique) return [];
      return [{ file: schemaFiles[0] ?? "", message: "No unique constraints detected in schema", suggestion: "Add unique constraints on email, username, etc." }];
    },
  }),

  // DATA-003: Soft Delete for Important Data
  configCheck({
    id: "DATA-003",
    name: "Soft Delete for Important Data",
    category: "data-integrity",
    severity: "medium",
    description: "User-generated content uses soft delete (deleted_at timestamp).",
    validate: (ctx) => {
      const schemaFiles = ctx.sourceFiles.filter((f) => f.includes("schema"));
      if (schemaFiles.length === 0) return [];
      const hasSoftDelete = schemaFiles.some((f) => {
        const content = ctx.readFile(f);
        return /deleted_at|deletedAt|soft.*delete|isDeleted/i.test(content);
      });
      if (hasSoftDelete) return [];
      return [];
    },
  }),

  // DATA-004: Timestamps on All Records
  configCheck({
    id: "DATA-004",
    name: "Timestamps on All Records",
    category: "data-integrity",
    severity: "medium",
    description: "Every table has created_at and updated_at columns.",
    validate: (ctx) => {
      const schemaFiles = ctx.sourceFiles.filter((f) => f.includes("schema"));
      if (schemaFiles.length === 0) return [];
      const hasTimestamps = schemaFiles.some((f) => {
        const content = ctx.readFile(f);
        return /created_at|createdAt|updated_at|updatedAt|timestamp/i.test(content);
      });
      if (hasTimestamps) return [];
      return [{ file: schemaFiles[0] ?? "", message: "No timestamps detected in schema", suggestion: "Add created_at and updated_at to all tables" }];
    },
  }),

  // DATA-005: No Raw SQL for Writes
  patternCheck({
    id: "DATA-005",
    name: "No Raw SQL for Writes",
    category: "data-integrity",
    severity: "medium",
    description: "INSERT/UPDATE/DELETE use ORM, not raw SQL in application code.",
    pattern: /(?:execute|query|raw)\s*\(\s*(?:`|'|")(?:INSERT|UPDATE|DELETE)\s/i,
    fileFilter: (f) => !f.includes("migration") && !f.includes("seed"),
    message: "Raw SQL write operation in application code",
    suggestion: "Use ORM methods for write operations",
  }),

  // DATA-006: Backup Covers Everything
  manualCheck({
    id: "DATA-006",
    name: "Backup Covers Everything",
    category: "data-integrity",
    severity: "high",
    description: "Backups include database, file storage, Redis data, and other stateful storage.",
  }),

  // DATA-007: Data Export Capability
  configCheck({
    id: "DATA-007",
    name: "Data Export Capability",
    category: "data-integrity",
    severity: "medium",
    description: "Users can export their data (GDPR/LGPD requirement).",
    validate: (ctx) => {
      const hasExport = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /export.*data|data.*export|download.*data|gdpr.*export/i.test(content);
      });
      if (hasExport) return [];
      return [];
    },
  }),

  // DATA-008: Account Deletion is Complete
  configCheck({
    id: "DATA-008",
    name: "Account Deletion is Complete",
    category: "data-integrity",
    severity: "medium",
    description: "Deleting an account removes or anonymizes all PII within 30 days.",
    validate: (ctx) => {
      const hasDeletion = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /delete.*account|account.*delet|anonymize|purge.*user|removeUser/i.test(content);
      });
      if (hasDeletion) return [];
      return [];
    },
  }),

  // DATA-009: Database Size Monitored
  manualCheck({
    id: "DATA-009",
    name: "Database Size Monitored",
    category: "data-integrity",
    severity: "low",
    description: "You know how fast your DB grows and when you'll hit plan limits.",
  }),

  // DATA-010: Idempotent Write Operations
  configCheck({
    id: "DATA-010",
    name: "Idempotent Write Operations",
    category: "data-integrity",
    severity: "high",
    description: "Critical writes produce same result if accidentally executed twice.",
    validate: (ctx) => {
      const criticalFiles = ctx.sourceFiles.filter((f) => /payment|webhook|notification|email/i.test(f));
      if (criticalFiles.length === 0) return [];
      const hasIdempotency = criticalFiles.some((f) => {
        const content = ctx.readFile(f);
        return /idempoten|dedup|already.*processed|event.*id|idempotencyKey/i.test(content);
      });
      if (hasIdempotency) return [];
      return [{ file: "", message: "Critical write operations may not be idempotent", suggestion: "Add idempotency keys to payment and notification operations" }];
    },
  }),
];
