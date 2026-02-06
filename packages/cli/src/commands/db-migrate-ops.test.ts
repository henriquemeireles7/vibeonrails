import { describe, it, expect } from "vitest";
import {
  formatDryRunOutput,
  planRollback,
  verifyRoundTrip,
  type MigrationRecord,
} from "./db-migrate-ops.js";

describe("Migration Operations", () => {
  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function makeMigration(version: string, name: string): MigrationRecord {
    return {
      version,
      name,
      appliedAt: new Date().toISOString(),
      upSql: `CREATE TABLE ${name} (id SERIAL);`,
      downSql: `DROP TABLE IF EXISTS ${name};`,
    };
  }

  // -----------------------------------------------------------------------
  // Dry-run output
  // -----------------------------------------------------------------------

  describe("formatDryRunOutput", () => {
    it("should format up migration for display", () => {
      const output = formatDryRunOutput(
        "CREATE TABLE users (id SERIAL); ALTER TABLE users ADD COLUMN email TEXT",
        "up",
      );

      expect(output).toContain("MIGRATE UP");
      expect(output).toContain("CREATE TABLE users");
      expect(output).toContain("ADD COLUMN email");
    });

    it("should format down migration for display", () => {
      const output = formatDryRunOutput("DROP TABLE IF EXISTS users", "down");

      expect(output).toContain("ROLLBACK DOWN");
      expect(output).toContain("DROP TABLE");
    });

    it("should handle empty SQL gracefully", () => {
      const output = formatDryRunOutput("", "up");
      expect(output).toContain("MIGRATE UP");
    });

    it("should format multiple statements with spacing", () => {
      const output = formatDryRunOutput(
        "CREATE TABLE a (id INT); CREATE TABLE b (id INT); CREATE TABLE c (id INT)",
        "up",
      );

      // Should have all three
      expect(output).toContain("CREATE TABLE a");
      expect(output).toContain("CREATE TABLE b");
      expect(output).toContain("CREATE TABLE c");
    });
  });

  // -----------------------------------------------------------------------
  // Rollback planning
  // -----------------------------------------------------------------------

  describe("planRollback", () => {
    it("should roll back the last migration when no target specified", () => {
      const applied = [
        makeMigration("20250301000000", "users"),
        makeMigration("20250302000000", "posts"),
        makeMigration("20250303000000", "comments"),
      ];

      const plan = planRollback(applied);

      expect(plan).toHaveLength(1);
      expect(plan[0].version).toBe("20250303000000");
    });

    it("should roll back to a specific version", () => {
      const applied = [
        makeMigration("20250301000000", "users"),
        makeMigration("20250302000000", "posts"),
        makeMigration("20250303000000", "comments"),
      ];

      const plan = planRollback(applied, "20250301000000");

      expect(plan).toHaveLength(2);
      expect(plan[0].version).toBe("20250303000000");
      expect(plan[1].version).toBe("20250302000000");
    });

    it("should return empty when no migrations applied", () => {
      const plan = planRollback([]);
      expect(plan).toHaveLength(0);
    });

    it("should return empty when target is latest", () => {
      const applied = [makeMigration("20250301000000", "users")];

      const plan = planRollback(applied, "20250301000000");
      expect(plan).toHaveLength(0);
    });

    it("should handle multi-step rollback (all migrations)", () => {
      const applied = [
        makeMigration("20250301000000", "users"),
        makeMigration("20250302000000", "posts"),
        makeMigration("20250303000000", "comments"),
      ];

      // Roll back to before anything
      const plan = planRollback(applied, "20250101000000");

      expect(plan).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // Round-trip verification
  // -----------------------------------------------------------------------

  describe("verifyRoundTrip", () => {
    it("should verify consistent up/down SQL", () => {
      const result = verifyRoundTrip(
        "CREATE TABLE users (id SERIAL);",
        "DROP TABLE IF EXISTS users;",
      );

      expect(result.consistent).toBe(true);
    });

    it("should reject empty up SQL", () => {
      const result = verifyRoundTrip("", "DROP TABLE users;");

      expect(result.consistent).toBe(false);
      expect(result.reason).toContain("Empty up SQL");
    });

    it("should reject empty down SQL", () => {
      const result = verifyRoundTrip("CREATE TABLE users (id SERIAL);", "");

      expect(result.consistent).toBe(false);
      expect(result.reason).toContain("Empty down SQL");
    });

    it("should reject down SQL with TODO markers", () => {
      const result = verifyRoundTrip(
        "DROP TABLE legacy;",
        "-- TODO: Manual rollback needed",
      );

      expect(result.consistent).toBe(false);
      expect(result.reason).toContain("TODO");
    });
  });
});
