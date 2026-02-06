import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateApp } from "./app.generator.js";

describe("app generator", () => {
  const testDir = join(tmpdir(), "aor-cli-app-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("creates the project directory with all template files", () => {
    generateApp("my-app", testDir);
    const projectDir = join(testDir, "my-app");

    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(projectDir, "README.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".env.example"))).toBe(true);
    expect(existsSync(join(projectDir, ".gitignore"))).toBe(true);
    expect(existsSync(join(projectDir, "src/main.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/router.ts"))).toBe(true);
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
