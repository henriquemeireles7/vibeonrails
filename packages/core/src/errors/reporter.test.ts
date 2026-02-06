import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ErrorReporter,
  createErrorReporter,
  type ErrorReport,
} from "./reporter.js";
import { CatalogError } from "./app-error.js";

describe("Error Reporter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Capture
  // -----------------------------------------------------------------------

  describe("capture", () => {
    it("should capture a standard Error", () => {
      const reporter = createErrorReporter();

      const report = reporter.capture(new Error("Something broke"));

      expect(report.id).toMatch(/^err-/);
      expect(report.message).toBe("Something broke");
      expect(report.timestamp).toBeTruthy();
      expect(report.stack).toBeTruthy();
      expect(report.statusCode).toBe(500);
      expect(report.code).toBeNull();
      expect(report.autoFixable).toBe(false);
    });

    it("should capture error with request context", () => {
      const reporter = createErrorReporter();

      const report = reporter.capture(new Error("Bad request"), {
        requestId: "req-abc-123",
        userId: "user-42",
        metadata: { endpoint: "/api/users" },
      });

      expect(report.requestId).toBe("req-abc-123");
      expect(report.userId).toBe("user-42");
      expect(report.metadata.endpoint).toBe("/api/users");
    });

    it("should capture CatalogError with full context", () => {
      const reporter = createErrorReporter();
      const catalogError = new CatalogError("VOR_AUTH_001");

      const report = reporter.capture(catalogError, {
        requestId: "req-xyz",
      });

      expect(report.code).toBe("VOR_AUTH_001");
      expect(report.statusCode).toBe(401);
      expect(report.autoFixable).toBe(false);
      expect(report.requestId).toBe("req-xyz");
    });

    it("should capture unknown error types", () => {
      const reporter = createErrorReporter();

      const report = reporter.capture("string error");

      expect(report.message).toBe("string error");
      expect(report.code).toBeNull();
      expect(report.stack).toBeNull();
    });

    it("should call writer when configured", () => {
      const reports: ErrorReport[] = [];
      const reporter = createErrorReporter({
        writer: (r) => reports.push(r),
      });

      reporter.capture(new Error("test"));

      expect(reports).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Batching (circular buffer)
  // -----------------------------------------------------------------------

  describe("batching", () => {
    it("should store errors in memory", () => {
      const reporter = createErrorReporter();

      reporter.capture(new Error("err1"));
      reporter.capture(new Error("err2"));
      reporter.capture(new Error("err3"));

      expect(reporter.size).toBe(3);
    });

    it("should evict oldest entries when maxEntries is exceeded", () => {
      const reporter = createErrorReporter({ maxEntries: 3 });

      reporter.capture(new Error("err1"));
      reporter.capture(new Error("err2"));
      reporter.capture(new Error("err3"));
      reporter.capture(new Error("err4"));

      expect(reporter.size).toBe(3);

      const all = reporter.query();
      expect(all.map((r) => r.message)).not.toContain("err1");
      expect(all.map((r) => r.message)).toContain("err4");
    });
  });

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  describe("query", () => {
    it("should return all stored errors", () => {
      const reporter = createErrorReporter();

      reporter.capture(new Error("first"));
      reporter.capture(new Error("second"));
      reporter.capture(new Error("third"));

      const results = reporter.query();

      expect(results).toHaveLength(3);
      const messages = results.map((r) => r.message);
      expect(messages).toContain("first");
      expect(messages).toContain("second");
      expect(messages).toContain("third");
    });

    it("should filter by time range", async () => {
      const reporter = createErrorReporter();

      reporter.capture(new Error("old"));
      // Small delay to separate timestamps
      await new Promise((r) => setTimeout(r, 10));
      reporter.capture(new Error("recent"));

      const results = reporter.query({ lastHours: 1 });
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter by error code", () => {
      const reporter = createErrorReporter();

      reporter.capture(new CatalogError("VOR_AUTH_001"));
      reporter.capture(new CatalogError("VOR_DB_001"));
      reporter.capture(new CatalogError("VOR_AUTH_001"));

      const results = reporter.query({ code: "VOR_AUTH_001" });
      expect(results).toHaveLength(2);
    });

    it("should filter by request ID", () => {
      const reporter = createErrorReporter();

      reporter.capture(new Error("e1"), { requestId: "req-1" });
      reporter.capture(new Error("e2"), { requestId: "req-2" });
      reporter.capture(new Error("e3"), { requestId: "req-1" });

      const results = reporter.query({ requestId: "req-1" });
      expect(results).toHaveLength(2);
    });

    it("should limit results", () => {
      const reporter = createErrorReporter();

      for (let i = 0; i < 10; i++) {
        reporter.capture(new Error(`err-${i}`));
      }

      const results = reporter.query({ limit: 3 });
      expect(results).toHaveLength(3);
    });

    it("should combine filters", () => {
      const reporter = createErrorReporter();

      reporter.capture(new CatalogError("VOR_AUTH_001"), {
        requestId: "req-1",
      });
      reporter.capture(new CatalogError("VOR_AUTH_001"), {
        requestId: "req-2",
      });
      reporter.capture(new CatalogError("VOR_DB_001"), { requestId: "req-1" });

      const results = reporter.query({
        code: "VOR_AUTH_001",
        requestId: "req-1",
      });
      expect(results).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  describe("getSummary", () => {
    it("should compute summary statistics", () => {
      const reporter = createErrorReporter();

      reporter.capture(new CatalogError("VOR_AUTH_001"));
      reporter.capture(new CatalogError("VOR_AUTH_002")); // autoFixable
      reporter.capture(new CatalogError("VOR_DB_001")); // autoFixable
      reporter.capture(new Error("generic"));

      const summary = reporter.getSummary();

      expect(summary.total).toBe(4);
      expect(summary.byCode.VOR_AUTH_001).toBe(1);
      expect(summary.byCode.VOR_DB_001).toBe(1);
      expect(summary.byCode.UNKNOWN).toBe(1);
      expect(summary.autoFixable).toBe(2);
    });

    it("should compute summary for time range", () => {
      const reporter = createErrorReporter();

      reporter.capture(new Error("err1"));
      reporter.capture(new Error("err2"));

      const summary = reporter.getSummary(24);
      expect(summary.total).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  describe("toJSON", () => {
    it("should export all entries as JSON", () => {
      const reporter = createErrorReporter();

      reporter.capture(new Error("err1"));
      reporter.capture(new Error("err2"));

      const json = reporter.toJSON();

      expect(json).toHaveLength(2);
      expect(json[0].message).toBe("err1");
    });
  });

  // -----------------------------------------------------------------------
  // Clear
  // -----------------------------------------------------------------------

  describe("clear", () => {
    it("should clear all entries", () => {
      const reporter = createErrorReporter();

      reporter.capture(new Error("err1"));
      reporter.capture(new Error("err2"));
      reporter.clear();

      expect(reporter.size).toBe(0);
      expect(reporter.query()).toHaveLength(0);
    });
  });
});
