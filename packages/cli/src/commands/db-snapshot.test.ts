import { describe, it, expect } from "vitest";
import {
  maskDatabaseUrl,
  sanitizeSnapshotName,
  getPgDumpCommand,
  getPgRestoreCommand,
  formatFileSize,
  formatSnapshot,
  DEFAULT_SNAPSHOT_DIR,
  type SnapshotMetadata,
} from "./db-snapshot.js";

describe("Database Snapshots", () => {
  // -----------------------------------------------------------------------
  // URL masking
  // -----------------------------------------------------------------------

  describe("maskDatabaseUrl", () => {
    it("should mask password in database URL", () => {
      const masked = maskDatabaseUrl(
        "postgres://user:secret123@localhost:5432/mydb",
      );
      expect(masked).toContain("***");
      expect(masked).not.toContain("secret123");
      expect(masked).toContain("localhost");
      expect(masked).toContain("mydb");
    });

    it("should handle URL without password", () => {
      const masked = maskDatabaseUrl("postgres://user@localhost:5432/mydb");
      expect(masked).toContain("localhost");
    });

    it("should handle invalid URL gracefully", () => {
      const masked = maskDatabaseUrl("not-a-url");
      expect(masked).toContain("***");
    });
  });

  // -----------------------------------------------------------------------
  // Name sanitization
  // -----------------------------------------------------------------------

  describe("sanitizeSnapshotName", () => {
    it("should lowercase the name", () => {
      expect(sanitizeSnapshotName("MySnapshot")).toBe("mysnapshot");
    });

    it("should replace spaces with hyphens", () => {
      expect(sanitizeSnapshotName("my snapshot")).toBe("my-snapshot");
    });

    it("should remove special characters", () => {
      expect(sanitizeSnapshotName("my@snapshot!")).toBe("my-snapshot");
    });

    it("should collapse multiple hyphens", () => {
      expect(sanitizeSnapshotName("my---snapshot")).toBe("my-snapshot");
    });

    it("should remove leading/trailing hyphens", () => {
      expect(sanitizeSnapshotName("-my-snapshot-")).toBe("my-snapshot");
    });

    it("should truncate long names to 64 chars", () => {
      const long = "a".repeat(100);
      expect(sanitizeSnapshotName(long).length).toBeLessThanOrEqual(64);
    });

    it("should allow underscores and hyphens", () => {
      expect(sanitizeSnapshotName("pre_deploy-v2")).toBe("pre_deploy-v2");
    });
  });

  // -----------------------------------------------------------------------
  // pg_dump / pg_restore commands
  // -----------------------------------------------------------------------

  describe("getPgDumpCommand", () => {
    it("should generate pg_dump command", () => {
      const cmd = getPgDumpCommand(
        "postgres://user:pass@localhost/db",
        ".vibe/snapshots/test.dump",
      );

      expect(cmd).toContain("pg_dump");
      expect(cmd).toContain("--format=custom");
      expect(cmd).toContain(".vibe/snapshots/test.dump");
    });
  });

  describe("getPgRestoreCommand", () => {
    it("should generate pg_restore command", () => {
      const cmd = getPgRestoreCommand(
        "postgres://user:pass@localhost/db",
        ".vibe/snapshots/test.dump",
      );

      expect(cmd).toContain("pg_restore");
      expect(cmd).toContain("--clean");
      expect(cmd).toContain("--if-exists");
      expect(cmd).toContain(".vibe/snapshots/test.dump");
    });
  });

  // -----------------------------------------------------------------------
  // File size formatting
  // -----------------------------------------------------------------------

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(2048)).toBe("2.0 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    });

    it("should format gigabytes", () => {
      expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe("2.0 GB");
    });
  });

  // -----------------------------------------------------------------------
  // Snapshot formatting
  // -----------------------------------------------------------------------

  describe("formatSnapshot", () => {
    it("should format a snapshot for display", () => {
      const snapshot: SnapshotMetadata = {
        name: "pre-deploy-v2",
        createdAt: new Date().toISOString(),
        sizeBytes: 1024 * 1024 * 15, // 15MB
        databaseUrl: "postgres://***@localhost/mydb",
        filePath: `${DEFAULT_SNAPSHOT_DIR}/pre-deploy-v2.dump`,
      };

      const output = formatSnapshot(snapshot);

      expect(output).toContain("pre-deploy-v2");
      expect(output).toContain("MB");
    });
  });

  // -----------------------------------------------------------------------
  // Default snapshot directory
  // -----------------------------------------------------------------------

  describe("DEFAULT_SNAPSHOT_DIR", () => {
    it("should be .vibe/snapshots", () => {
      expect(DEFAULT_SNAPSHOT_DIR).toBe(".vibe/snapshots");
    });
  });
});
