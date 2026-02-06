/**
 * Module Registry — Tests
 *
 * Tests for module lookup, dependency resolution, and file manifest generation.
 */

import { describe, it, expect } from "vitest";
import {
  MODULE_REGISTRY,
  getModule,
  getModulesByCategory,
  resolveDependencies,
  generateFileManifest,
  type ModuleDefinition,
} from "./registry.js";

describe("MODULE_REGISTRY", () => {
  it("should contain all expected modules", () => {
    const names = MODULE_REGISTRY.map((m) => m.name);
    expect(names).toContain("marketing");
    expect(names).toContain("sales");
    expect(names).toContain("support-chat");
    expect(names).toContain("support-feedback");
    expect(names).toContain("finance");
    expect(names).toContain("notifications");
    expect(names).toContain("payments");
    expect(names).toContain("admin");
    expect(names).toContain("companion");
  });

  it("should have valid structure for all modules", () => {
    for (const mod of MODULE_REGISTRY) {
      expect(mod.name).toBeTruthy();
      expect(mod.package).toMatch(/^@vibeonrails\//);
      expect(mod.description).toBeTruthy();
      expect(["ops", "features", "sites", "infra"]).toContain(mod.category);
      expect(Array.isArray(mod.dependencies)).toBe(true);
      expect(Array.isArray(mod.files)).toBe(true);
      expect(Array.isArray(mod.routes)).toBe(true);
      expect(Array.isArray(mod.postInstallSteps)).toBe(true);
    }
  });

  it("should have unique names", () => {
    const names = MODULE_REGISTRY.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("should have unique packages", () => {
    const packages = MODULE_REGISTRY.map((m) => m.package);
    expect(new Set(packages).size).toBe(packages.length);
  });
});

describe("getModule", () => {
  it("should find a module by name", () => {
    const marketing = getModule("marketing");
    expect(marketing).toBeDefined();
    expect(marketing?.package).toBe("@vibeonrails/marketing");
    expect(marketing?.category).toBe("ops");
  });

  it("should return undefined for unknown module", () => {
    expect(getModule("nonexistent")).toBeUndefined();
  });

  it("should return correct module details", () => {
    const payments = getModule("payments");
    expect(payments?.name).toBe("payments");
    expect(payments?.category).toBe("features");
    expect(payments?.dependencies).toContain("@vibeonrails/payments");
  });
});

describe("getModulesByCategory", () => {
  it("should return ops modules", () => {
    const ops = getModulesByCategory("ops");
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every((m) => m.category === "ops")).toBe(true);
  });

  it("should return features modules", () => {
    const features = getModulesByCategory("features");
    expect(features.length).toBeGreaterThan(0);
    expect(features.every((m) => m.category === "features")).toBe(true);
  });

  it("should return empty for unused categories", () => {
    const sites = getModulesByCategory("sites");
    expect(sites).toEqual([]);
  });
});

describe("resolveDependencies", () => {
  it("should resolve a module with no peer dependencies", () => {
    const deps = resolveDependencies("sales");
    expect(deps).toContain("sales");
  });

  it("should return empty for unknown module", () => {
    const deps = resolveDependencies("nonexistent");
    expect(deps).toEqual([]);
  });

  it("should not duplicate modules", () => {
    const deps = resolveDependencies("marketing");
    const unique = new Set(deps);
    expect(unique.size).toBe(deps.length);
  });
});

describe("generateFileManifest", () => {
  it("should generate file paths for marketing module", () => {
    const files = generateFileManifest("marketing", "/project");
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.startsWith("/project"))).toBe(true);
  });

  it("should return empty for unknown module", () => {
    const files = generateFileManifest("nonexistent", "/project");
    expect(files).toEqual([]);
  });

  it("should include content directories", () => {
    const files = generateFileManifest("marketing", "/project");
    const hasContentFiles = files.some((f) => f.includes("content/marketing"));
    expect(hasContentFiles).toBe(true);
  });
});
