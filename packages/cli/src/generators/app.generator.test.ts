import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateApp } from "./app.generator.js";

describe("app generator", () => {
  const testDir = join(tmpdir(), "vibe-cli-app-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("creates the project directory with all template files", () => {
    generateApp("my-app", testDir);
    const projectDir = join(testDir, "my-app");

    // Root config
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(projectDir, "README.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".env.example"))).toBe(true);
    expect(existsSync(join(projectDir, ".gitignore"))).toBe(true);
    expect(existsSync(join(projectDir, "drizzle.config.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "SKILL.md"))).toBe(true);

    // App entry
    expect(existsSync(join(projectDir, "src/main.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/router.ts"))).toBe(true);

    // Config
    expect(existsSync(join(projectDir, "src/config/app.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/config/database.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/config/env.ts"))).toBe(true);

    // Built-in modules
    expect(existsSync(join(projectDir, "src/modules/auth/auth.types.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/auth/auth.service.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/auth/auth.controller.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/auth/auth.test.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/user/user.types.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/user/user.service.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/user/user.controller.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/user/user.test.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/post/post.types.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/post/post.service.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/post/post.controller.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/modules/post/post.test.ts"))).toBe(true);

    // Database seeds
    expect(existsSync(join(projectDir, "src/database/seeds/development.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/database/seeds/test.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/database/seeds/index.ts"))).toBe(true);

    // Planning system
    expect(existsSync(join(projectDir, ".plan/SKILL.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".plan/PROJECT.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".plan/CONTEXT.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".plan/ROADMAP.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".plan/CURRENT.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".plan/DECISIONS.md"))).toBe(true);
  });

  it("replaces {{projectName}} placeholder in package.json", () => {
    generateApp("my-cool-app", testDir);
    const pkgJson = readFileSync(
      join(testDir, "my-cool-app", "package.json"),
      "utf-8",
    );

    expect(pkgJson).toContain('"name": "my-cool-app"');
    expect(pkgJson).not.toContain("{{projectName}}");
  });

  it("replaces {{projectName}} placeholder in README.md", () => {
    generateApp("my-cool-app", testDir);
    const readme = readFileSync(
      join(testDir, "my-cool-app", "README.md"),
      "utf-8",
    );

    expect(readme).toContain("# my-cool-app");
    expect(readme).not.toContain("{{projectName}}");
  });

  it("replaces {{projectName}} placeholder in .env.example", () => {
    generateApp("my-cool-app", testDir);
    const envExample = readFileSync(
      join(testDir, "my-cool-app", ".env.example"),
      "utf-8",
    );

    expect(envExample).toContain("my-cool-app");
    expect(envExample).not.toContain("{{projectName}}");
  });

  it("replaces {{projectName}} in main.ts", () => {
    generateApp("my-cool-app", testDir);
    const main = readFileSync(
      join(testDir, "my-cool-app", "src/main.ts"),
      "utf-8",
    );

    expect(main).toContain("my-cool-app");
    expect(main).not.toContain("{{projectName}}");
  });

  it("replaces {{projectName}} in config/app.ts", () => {
    generateApp("my-cool-app", testDir);
    const appConfig = readFileSync(
      join(testDir, "my-cool-app", "src/config/app.ts"),
      "utf-8",
    );

    expect(appConfig).toContain("my-cool-app");
    expect(appConfig).not.toContain("{{projectName}}");
  });

  it("converts PascalCase name to kebab-case directory", () => {
    generateApp("MyApp", testDir);
    expect(existsSync(join(testDir, "my-app", "package.json"))).toBe(true);
  });

  it("returns result with project details", () => {
    const result = generateApp("test-app", testDir);

    expect(result.projectName).toBe("test-app");
    expect(result.directory).toContain("test-app");
    expect(result.files.length).toBeGreaterThan(0);
  });
});
