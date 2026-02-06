import { describe, it, expect } from "vitest";
import {
  generateMigrationVersion,
  classifyOperation,
  parseOperations,
  describeOperation,
  generateDownOperations,
  reverseOperation,
  formatMigrationFile,
  type GeneratedMigration,
} from "./db-migrate-create.js";

describe("Migration Create", () => {
  // -----------------------------------------------------------------------
  // Version generation
  // -----------------------------------------------------------------------

  describe("generateMigrationVersion", () => {
    it("should generate timestamp-based version", () => {
      const date = new Date("2025-03-15T14:30:45.000Z");
      const version = generateMigrationVersion(date);
      expect(version).toBe("20250315143045");
    });

    it("should pad single-digit values", () => {
      const date = new Date("2025-01-05T09:05:03.000Z");
      const version = generateMigrationVersion(date);
      expect(version).toBe("20250105090503");
    });

    it("should generate a valid version from current time", () => {
      const version = generateMigrationVersion();
      expect(version).toMatch(/^\d{14}$/);
    });
  });

  // -----------------------------------------------------------------------
  // Operation classification
  // -----------------------------------------------------------------------

  describe("classifyOperation", () => {
    it("should classify CREATE TABLE as additive", () => {
      const result = classifyOperation(
        "CREATE TABLE users (id SERIAL PRIMARY KEY)",
      );
      expect(result.type).toBe("additive");
    });

    it("should classify ADD COLUMN as additive", () => {
      const result = classifyOperation("ALTER TABLE users ADD COLUMN bio TEXT");
      expect(result.type).toBe("additive");
    });

    it("should classify CREATE INDEX as additive", () => {
      const result = classifyOperation(
        "CREATE INDEX idx_users_email ON users (email)",
      );
      expect(result.type).toBe("additive");
    });

    it("should classify DROP TABLE as destructive", () => {
      const result = classifyOperation("DROP TABLE users");
      expect(result.type).toBe("destructive");
      expect(result.reason).toContain("Drop table");
    });

    it("should classify DROP COLUMN as destructive", () => {
      const result = classifyOperation("ALTER TABLE users DROP COLUMN bio");
      expect(result.type).toBe("destructive");
    });

    it("should classify RENAME as destructive", () => {
      const result = classifyOperation("ALTER TABLE users RENAME TO people");
      expect(result.type).toBe("destructive");
    });

    it("should classify TRUNCATE as destructive", () => {
      const result = classifyOperation("TRUNCATE TABLE logs");
      expect(result.type).toBe("destructive");
    });

    it("should classify DROP INDEX as destructive", () => {
      const result = classifyOperation("DROP INDEX idx_users_email");
      expect(result.type).toBe("destructive");
    });
  });

  // -----------------------------------------------------------------------
  // Parse operations
  // -----------------------------------------------------------------------

  describe("parseOperations", () => {
    it("should parse multiple SQL statements", () => {
      const sql =
        "CREATE TABLE users (id SERIAL); ALTER TABLE users ADD COLUMN email TEXT";
      const ops = parseOperations(sql);

      expect(ops).toHaveLength(2);
      expect(ops[0].type).toBe("additive");
      expect(ops[1].type).toBe("additive");
    });

    it("should handle trailing semicolons", () => {
      const sql = "CREATE TABLE users (id SERIAL);";
      const ops = parseOperations(sql);
      expect(ops).toHaveLength(1);
    });

    it("should skip empty statements", () => {
      const sql = "CREATE TABLE users (id SERIAL); ; ;";
      const ops = parseOperations(sql);
      expect(ops).toHaveLength(1);
    });

    it("should include descriptions", () => {
      const sql = "CREATE TABLE users (id SERIAL)";
      const ops = parseOperations(sql);
      expect(ops[0].description).toContain("users");
    });
  });

  // -----------------------------------------------------------------------
  // Describe operation
  // -----------------------------------------------------------------------

  describe("describeOperation", () => {
    it("should describe CREATE TABLE", () => {
      expect(describeOperation("CREATE TABLE users (id SERIAL)")).toBe(
        'Create table "users"',
      );
    });

    it("should describe ADD COLUMN", () => {
      expect(describeOperation("ALTER TABLE users ADD COLUMN bio TEXT")).toBe(
        'Add column "bio" to "users"',
      );
    });

    it("should describe DROP COLUMN", () => {
      expect(describeOperation("ALTER TABLE users DROP COLUMN bio")).toBe(
        'Drop column "bio" from "users"',
      );
    });

    it("should describe CREATE INDEX", () => {
      expect(
        describeOperation("CREATE INDEX idx_users_email ON users (email)"),
      ).toBe('Create index "idx_users_email"');
    });

    it("should describe DROP TABLE", () => {
      expect(describeOperation("DROP TABLE users")).toBe('Drop table "users"');
    });

    it("should describe DROP INDEX", () => {
      expect(describeOperation("DROP INDEX idx_users_email")).toBe(
        'Drop index "idx_users_email"',
      );
    });

    it("should truncate long unknown operations", () => {
      const longSql = "A".repeat(100);
      const desc = describeOperation(longSql);
      expect(desc.length).toBeLessThanOrEqual(63); // 60 + "..."
    });
  });

  // -----------------------------------------------------------------------
  // Reverse operation
  // -----------------------------------------------------------------------

  describe("reverseOperation", () => {
    it("should reverse CREATE TABLE to DROP TABLE", () => {
      expect(reverseOperation("CREATE TABLE users (id SERIAL)")).toBe(
        "DROP TABLE IF EXISTS users;",
      );
    });

    it("should reverse ADD COLUMN to DROP COLUMN", () => {
      expect(reverseOperation("ALTER TABLE users ADD COLUMN bio TEXT")).toBe(
        "ALTER TABLE users DROP COLUMN IF EXISTS bio;",
      );
    });

    it("should reverse CREATE INDEX to DROP INDEX", () => {
      expect(reverseOperation("CREATE INDEX idx_email ON users (email)")).toBe(
        "DROP INDEX IF EXISTS idx_email;",
      );
    });

    it("should return null for irreversible operations", () => {
      expect(reverseOperation("DROP TABLE users")).toBeNull();
      expect(reverseOperation("TRUNCATE TABLE logs")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Generate down operations
  // -----------------------------------------------------------------------

  describe("generateDownOperations", () => {
    it("should generate reversed operations in reverse order", () => {
      const upOps = parseOperations(
        "CREATE TABLE users (id SERIAL); ALTER TABLE users ADD COLUMN email TEXT",
      );

      const downOps = generateDownOperations(upOps);

      expect(downOps).toHaveLength(2);
      // Reversed order: drop column first, then drop table
      expect(downOps[0].sql).toContain("DROP COLUMN");
      expect(downOps[1].sql).toContain("DROP TABLE");
    });

    it("should generate TODO comments for irreversible operations", () => {
      const upOps = parseOperations("DROP TABLE legacy_data");
      const downOps = generateDownOperations(upOps);

      expect(downOps[0].sql).toContain("TODO");
    });
  });

  // -----------------------------------------------------------------------
  // Format migration file
  // -----------------------------------------------------------------------

  describe("formatMigrationFile", () => {
    it("should generate valid TypeScript migration file", () => {
      const migration: GeneratedMigration = {
        version: "20250315143045",
        name: "add-bio",
        up: [
          {
            sql: "ALTER TABLE users ADD COLUMN bio TEXT;",
            type: "additive",
            description: 'Add column "bio" to "users"',
          },
        ],
        down: [
          {
            sql: "ALTER TABLE users DROP COLUMN IF EXISTS bio;",
            type: "destructive",
            description: 'Drop column "bio" from "users"',
          },
        ],
        hasDestructive: false,
        filePath: "migrations/20250315143045_add-bio.ts",
      };

      const content = formatMigrationFile(migration);

      expect(content).toContain("20250315143045_add-bio");
      expect(content).toContain("export async function up");
      expect(content).toContain("export async function down");
      expect(content).toContain("ADD COLUMN bio TEXT");
      expect(content).toContain("DROP COLUMN IF EXISTS bio");
      expect(content).toContain("Safe: additive-only operations");
    });

    it("should mark destructive migrations with warning", () => {
      const migration: GeneratedMigration = {
        version: "20250315143045",
        name: "drop-legacy",
        up: [
          {
            sql: "DROP TABLE legacy;",
            type: "destructive",
            description: 'Drop table "legacy"',
          },
        ],
        down: [
          {
            sql: '-- TODO: Manual rollback needed for: Drop table "legacy"',
            type: "additive",
            description: "Manual rollback",
          },
        ],
        hasDestructive: true,
        filePath: "migrations/20250315143045_drop-legacy.ts",
      };

      const content = formatMigrationFile(migration);

      expect(content).toContain("WARNING: Contains destructive operations");
      expect(content).toContain("// DESTRUCTIVE");
    });
  });
});
