import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildAuditContext } from "../context.js";

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `vibe-audit-ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("buildAuditContext", () => {
  let root: string;

  beforeEach(() => {
    root = makeTmpDir();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("collects source files excluding node_modules and dist", async () => {
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "node_modules/pkg"), { recursive: true });
    mkdirSync(join(root, "dist"), { recursive: true });

    writeFileSync(join(root, "src/app.ts"), "const x = 1;");
    writeFileSync(join(root, "src/utils.tsx"), "export const Y = 2;");
    writeFileSync(join(root, "node_modules/pkg/index.js"), "module.exports = {};");
    writeFileSync(join(root, "dist/app.js"), "var x = 1;");

    const ctx = await buildAuditContext(root);

    expect(ctx.sourceFiles).toContain("src/app.ts");
    expect(ctx.sourceFiles).toContain("src/utils.tsx");
    expect(ctx.sourceFiles).not.toContain("node_modules/pkg/index.js");
    expect(ctx.sourceFiles).not.toContain("dist/app.js");
  });

  it("separates test files from source files", async () => {
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src/app.ts"), "const x = 1;");
    writeFileSync(join(root, "src/app.test.ts"), "test('x', () => {});");
    writeFileSync(join(root, "src/app.spec.ts"), "test('x', () => {});");

    const ctx = await buildAuditContext(root);

    expect(ctx.sourceFiles).toContain("src/app.ts");
    expect(ctx.sourceFiles).not.toContain("src/app.test.ts");
    expect(ctx.sourceFiles).not.toContain("src/app.spec.ts");
    expect(ctx.testFiles).toContain("src/app.test.ts");
    expect(ctx.testFiles).toContain("src/app.spec.ts");
  });

  it("reads files with caching", async () => {
    writeFileSync(join(root, "file.ts"), "hello world");
    const ctx = await buildAuditContext(root);

    const content1 = ctx.readFile("file.ts");
    const content2 = ctx.readFile("file.ts");

    expect(content1).toBe("hello world");
    expect(content2).toBe("hello world");
  });

  it("returns empty string for missing files", async () => {
    const ctx = await buildAuditContext(root);
    expect(ctx.readFile("nope.ts")).toBe("");
  });

  it("checks file existence", async () => {
    writeFileSync(join(root, "exists.ts"), "yes");
    const ctx = await buildAuditContext(root);

    expect(ctx.fileExists("exists.ts")).toBe(true);
    expect(ctx.fileExists("nope.ts")).toBe(false);
  });

  it("returns file lines", async () => {
    writeFileSync(join(root, "multi.ts"), "line1\nline2\nline3");
    const ctx = await buildAuditContext(root);

    const lines = ctx.fileLines("multi.ts");
    expect(lines).toEqual(["line1", "line2", "line3"]);
  });

  it("parses package.json when present", async () => {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "test-app", version: "1.0.0" }),
    );
    const ctx = await buildAuditContext(root);

    expect(ctx.packageJson).toEqual({ name: "test-app", version: "1.0.0" });
  });

  it("sets packageJson to null when missing", async () => {
    const ctx = await buildAuditContext(root);
    expect(ctx.packageJson).toBeNull();
  });
});
