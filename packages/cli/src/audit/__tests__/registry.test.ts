import { describe, it, expect } from "vitest";
import { getChecks, filterChecks, getAllCheckIds } from "../registry.js";
import type { AuditFilterOptions } from "../types.js";

describe("registry", () => {
  it("returns all 172 checks from vibeaudit.md", () => {
    const checks = getChecks();
    expect(checks).toHaveLength(172);
  });

  it("has unique IDs for all checks", () => {
    const checks = getChecks();
    const ids = checks.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("getAllCheckIds returns all IDs", () => {
    const ids = getAllCheckIds();
    expect(ids).toHaveLength(172);
    expect(ids[0]).toBeDefined();
  });

  describe("filterChecks", () => {
    it("filters by category", () => {
      const filtered = filterChecks({ categories: ["security"] });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((c) => c.category === "security")).toBe(true);
    });

    it("filters by severity", () => {
      const filtered = filterChecks({ severities: ["critical"] });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((c) => c.severity === "critical")).toBe(true);
    });

    it("filters by top30Only", () => {
      const filtered = filterChecks({ top30Only: true });
      expect(filtered).toHaveLength(30);
      expect(filtered.every((c) => c.id.startsWith("TOP-"))).toBe(true);
    });

    it("filters by specific IDs", () => {
      const filtered = filterChecks({ ids: ["TOP-001", "TOP-002"] });
      expect(filtered).toHaveLength(2);
    });

    it("excludes specific IDs", () => {
      const all = getChecks();
      const filtered = filterChecks({ excludeIds: ["TOP-001"] });
      expect(filtered).toHaveLength(all.length - 1);
    });

    it("filters automatableOnly", () => {
      const filtered = filterChecks({ automatableOnly: true });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((c) => c.automatable)).toBe(true);
    });

    it("returns all checks with empty filter", () => {
      const filtered = filterChecks({});
      expect(filtered).toHaveLength(172);
    });
  });

  describe("check categories", () => {
    it("has 30 checks in top30 category", () => {
      const filtered = filterChecks({ categories: ["top30"] });
      expect(filtered).toHaveLength(30);
    });

    it("has 15 checks in security category", () => {
      const filtered = filterChecks({ categories: ["security"] });
      expect(filtered).toHaveLength(15);
    });

    it("has 15 checks in performance category", () => {
      const filtered = filterChecks({ categories: ["performance"] });
      expect(filtered).toHaveLength(15);
    });

    it("has 12 checks in testing category", () => {
      const filtered = filterChecks({ categories: ["testing"] });
      expect(filtered).toHaveLength(12);
    });

    it("has 15 checks in code-quality category", () => {
      const filtered = filterChecks({ categories: ["code-quality"] });
      expect(filtered).toHaveLength(15);
    });

    it("has 10 checks in error-handling category", () => {
      const filtered = filterChecks({ categories: ["error-handling"] });
      expect(filtered).toHaveLength(10);
    });

    it("has 10 checks in architecture category", () => {
      const filtered = filterChecks({ categories: ["architecture"] });
      expect(filtered).toHaveLength(10);
    });

    it("has 7 checks in deployment category", () => {
      const filtered = filterChecks({ categories: ["deployment"] });
      expect(filtered).toHaveLength(7);
    });

    it("has 8 checks in observability category", () => {
      const filtered = filterChecks({ categories: ["observability"] });
      expect(filtered).toHaveLength(8);
    });

    it("has 10 checks in business category", () => {
      const filtered = filterChecks({ categories: ["business"] });
      expect(filtered).toHaveLength(10);
    });

    it("has 10 checks in data-integrity category", () => {
      const filtered = filterChecks({ categories: ["data-integrity"] });
      expect(filtered).toHaveLength(10);
    });

    it("has 10 checks in ux category", () => {
      const filtered = filterChecks({ categories: ["ux"] });
      expect(filtered).toHaveLength(10);
    });

    it("has 8 checks in compliance category", () => {
      const filtered = filterChecks({ categories: ["compliance"] });
      expect(filtered).toHaveLength(8);
    });

    it("has 12 checks in ai-patterns category", () => {
      const filtered = filterChecks({ categories: ["ai-patterns"] });
      expect(filtered).toHaveLength(12);
    });
  });
});
