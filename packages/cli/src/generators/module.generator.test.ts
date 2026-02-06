import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateModule } from "./module.generator.js";

describe("module generator", () => {
  const testDir = join(tmpdir(), "vibe-cli-module-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("generates all module files for a simple name", () => {
    generateModule("user", testDir);

    const files = [
      "user/types.ts",
      "user/user.service.ts",
      "user/user.controller.ts",
      "user/user.service.test.ts",
      "user/index.ts",
      "user/SKILL.md",
    ];

    for (const file of files) {
      expect(existsSync(join(testDir, file))).toBe(true);
    }
  });

  it("generates all module files for a kebab-case name", () => {
    generateModule("blog-post", testDir);

    const files = [
      "blog-post/types.ts",
      "blog-post/blog-post.service.ts",
      "blog-post/blog-post.controller.ts",
      "blog-post/blog-post.service.test.ts",
      "blog-post/index.ts",
      "blog-post/SKILL.md",
    ];

    for (const file of files) {
      expect(existsSync(join(testDir, file))).toBe(true);
    }
  });

  it("generates types.ts with correct Zod schema and TypeScript types", () => {
    generateModule("user", testDir);

    const content = readFileSync(join(testDir, "user/types.ts"), "utf-8");

    expect(content).toContain('import { z } from "zod"');
    expect(content).toContain("UserSchema");
    expect(content).toContain("CreateUserSchema");
    expect(content).toContain("UpdateUserSchema");
    expect(content).toContain("type User");
    expect(content).toContain("type CreateUser");
    expect(content).toContain("type UpdateUser");
  });

  it("generates service with CRUD operations", () => {
    generateModule("user", testDir);

    const content = readFileSync(
      join(testDir, "user/user.service.ts"),
      "utf-8",
    );

    expect(content).toContain("findAll");
    expect(content).toContain("findById");
    expect(content).toContain("create");
    expect(content).toContain("update");
    expect(content).toContain("remove");
    expect(content).toContain("UserService");
  });

  it("generates controller with tRPC router", () => {
    generateModule("user", testDir);

    const content = readFileSync(
      join(testDir, "user/user.controller.ts"),
      "utf-8",
    );

    expect(content).toContain("userRouter");
    expect(content).toContain("router");
    expect(content).toContain("list");
    expect(content).toContain("getById");
    expect(content).toContain("create");
    expect(content).toContain("update");
    expect(content).toContain("remove");
  });

  it("generates test file with describe block", () => {
    generateModule("user", testDir);

    const content = readFileSync(
      join(testDir, "user/user.service.test.ts"),
      "utf-8",
    );

    expect(content).toContain("describe");
    expect(content).toContain("UserService");
    expect(content).toContain("vitest");
  });

  it("generates index.ts barrel export", () => {
    generateModule("user", testDir);

    const content = readFileSync(join(testDir, "user/index.ts"), "utf-8");

    expect(content).toContain("export");
    expect(content).toContain("./types");
    expect(content).toContain("./user.service");
    expect(content).toContain("./user.controller");
  });

  it("generates SKILL.md with module-specific content", () => {
    generateModule("user", testDir);

    const content = readFileSync(join(testDir, "user/SKILL.md"), "utf-8");

    expect(content).toContain("# User Module");
    expect(content).toContain("user.service.ts");
    expect(content).toContain("user.controller.ts");
    expect(content).toContain("userRouter");
  });

  it("uses PascalCase for class names with multi-word modules", () => {
    generateModule("blog-post", testDir);

    const serviceContent = readFileSync(
      join(testDir, "blog-post/blog-post.service.ts"),
      "utf-8",
    );
    const controllerContent = readFileSync(
      join(testDir, "blog-post/blog-post.controller.ts"),
      "utf-8",
    );
    const typesContent = readFileSync(
      join(testDir, "blog-post/types.ts"),
      "utf-8",
    );

    expect(serviceContent).toContain("BlogPostService");
    expect(controllerContent).toContain("blogPostRouter");
    expect(typesContent).toContain("BlogPostSchema");
  });

  it("returns the list of generated files", () => {
    const result = generateModule("user", testDir);

    expect(result.files).toHaveLength(6);
    expect(result.moduleName).toBe("user");
    expect(result.directory).toContain("user");
  });
});
