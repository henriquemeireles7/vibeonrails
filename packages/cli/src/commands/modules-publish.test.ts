/**
 * `vibe modules publish` — Tests
 *
 * Tests for module publishing:
 * - Validation (SKILL.md required, barrel exports, types)
 * - Package structure validation
 * - Metadata extraction
 * - Community module listing
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import {
  validateModuleStructure,
  extractModuleMetadata,
} from "./modules-publish.js";

// ---------------------------------------------------------------------------
// Helper: create a valid module structure
// ---------------------------------------------------------------------------

function createValidModule(dir: string): void {
  // package.json
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "@vibeonrails/my-module",
        version: "1.0.0",
        type: "module",
        description: "A test VoR module",
        exports: {
          ".": {
            import: "./dist/index.js",
            types: "./dist/index.d.ts",
          },
        },
        scripts: {
          build: "tsup",
          test: "vitest run",
        },
      },
      null,
      2,
    ),
  );

  // SKILL.md
  writeFileSync(
    join(dir, "SKILL.md"),
    "# My Module\n\n## Purpose\nTest module.\n",
  );

  // tsconfig.json
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { outDir: "dist" } }),
  );

  // src/index.ts
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(
    join(dir, "src", "index.ts"),
    "export const hello = 'world';\n",
  );
}

// ---------------------------------------------------------------------------
// validateModuleStructure
// ---------------------------------------------------------------------------

describe("validateModuleStructure", () => {
  const testDir = join(tmpdir(), "vibe-publish-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should pass for a valid module", () => {
    createValidModule(testDir);
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when package.json is missing", () => {
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing package.json");
  });

  it("should fail when package.json is invalid JSON", () => {
    writeFileSync(join(testDir, "package.json"), "not json {{");
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid package.json");
  });

  it("should fail when SKILL.md is missing", () => {
    createValidModule(testDir);
    rmSync(join(testDir, "SKILL.md"));
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("SKILL.md"))).toBe(true);
  });

  it("should fail when barrel export is missing", () => {
    createValidModule(testDir);
    rmSync(join(testDir, "src", "index.ts"));
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("barrel export"))).toBe(true);
  });

  it("should fail when build script is missing", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/test",
        version: "1.0.0",
        type: "module",
        scripts: { test: "vitest run" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("build"))).toBe(true);
  });

  it("should warn when package name does not follow VoR convention", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "my-random-package",
        version: "1.0.0",
        type: "module",
        exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
        scripts: { build: "tsup", test: "vitest run" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("naming"))).toBe(true);
  });

  it("should warn when tsconfig.json is missing", () => {
    createValidModule(testDir);
    rmSync(join(testDir, "tsconfig.json"));
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("tsconfig"))).toBe(true);
  });

  it("should warn when exports field is missing", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/test",
        version: "1.0.0",
        type: "module",
        scripts: { build: "tsup", test: "vitest run" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.warnings.some((w) => w.includes("exports"))).toBe(true);
  });

  it("should warn when types export is missing", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/test",
        version: "1.0.0",
        type: "module",
        exports: { ".": { import: "./dist/index.js" } },
        scripts: { build: "tsup", test: "vitest run" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.warnings.some((w) => w.includes("types"))).toBe(true);
  });

  it("should warn when test script is missing", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/test",
        version: "1.0.0",
        type: "module",
        exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
        scripts: { build: "tsup" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.warnings.some((w) => w.includes("test"))).toBe(true);
  });

  it("should warn when type is not module", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "@vibeonrails/test",
        version: "1.0.0",
        exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
        scripts: { build: "tsup", test: "vitest run" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.warnings.some((w) => w.includes("module"))).toBe(true);
  });

  it("should accept vor- prefix for package names", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "vor-analytics",
        version: "1.0.0",
        type: "module",
        exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
        scripts: { build: "tsup", test: "vitest run" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(true);
    expect(result.warnings.filter((w) => w.includes("naming"))).toHaveLength(0);
  });

  it("should accept vibeonrails- prefix for package names", () => {
    createValidModule(testDir);
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "vibeonrails-auth",
        version: "1.0.0",
        type: "module",
        exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
        scripts: { build: "tsup", test: "vitest run" },
      }),
    );
    const result = validateModuleStructure(testDir);
    expect(result.valid).toBe(true);
    expect(result.warnings.filter((w) => w.includes("naming"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// extractModuleMetadata
// ---------------------------------------------------------------------------

describe("extractModuleMetadata", () => {
  const testDir = join(tmpdir(), "vibe-metadata-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should extract metadata from a valid module", () => {
    createValidModule(testDir);
    const metadata = extractModuleMetadata(testDir);

    expect(metadata).not.toBeNull();
    expect(metadata!.name).toBe("@vibeonrails/my-module");
    expect(metadata!.version).toBe("1.0.0");
    expect(metadata!.description).toBe("A test VoR module");
    expect(metadata!.hasSkillMd).toBe(true);
    expect(metadata!.hasBarrelExport).toBe(true);
    expect(metadata!.hasTypes).toBe(true);
    expect(metadata!.hasBuildScript).toBe(true);
    expect(metadata!.hasTestScript).toBe(true);
  });

  it("should return null when package.json is missing", () => {
    const metadata = extractModuleMetadata(testDir);
    expect(metadata).toBeNull();
  });

  it("should return null when package.json is invalid", () => {
    writeFileSync(join(testDir, "package.json"), "not json {{");
    const metadata = extractModuleMetadata(testDir);
    expect(metadata).toBeNull();
  });

  it("should handle missing optional fields", () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test" }),
    );
    const metadata = extractModuleMetadata(testDir);
    expect(metadata).not.toBeNull();
    expect(metadata!.version).toBe("0.0.0");
    expect(metadata!.description).toBe("");
    expect(metadata!.hasSkillMd).toBe(false);
    expect(metadata!.hasBarrelExport).toBe(false);
    expect(metadata!.hasBuildScript).toBe(false);
    expect(metadata!.hasTestScript).toBe(false);
  });

  it("should detect barrel export in src/index.js", () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test" }),
    );
    mkdirSync(join(testDir, "src"), { recursive: true });
    writeFileSync(join(testDir, "src", "index.js"), "module.exports = {};");
    const metadata = extractModuleMetadata(testDir);
    expect(metadata!.hasBarrelExport).toBe(true);
  });
});
