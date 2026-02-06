import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { generateDocs } from "./docs.generator.js";

const TEST_DIR = join(import.meta.dirname ?? __dirname, "..", "..", "tmp-test-docs");

describe("generateDocs", () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("creates docs directory", () => {
    mkdirSync(TEST_DIR, { recursive: true });

    const result = generateDocs(
      {
        name: "test-project",
        title: "Test Project",
        description: "A test project",
      },
      TEST_DIR,
    );

    expect(result.directory).toBe(join(TEST_DIR, "docs"));
    expect(existsSync(result.directory)).toBe(true);
  });

  it("generates files from templates", () => {
    mkdirSync(TEST_DIR, { recursive: true });

    const result = generateDocs(
      {
        name: "my-app",
        title: "My App",
        description: "My awesome app docs",
        packageName: "@myorg/core",
        githubOrg: "myorg",
        githubRepo: "my-app",
      },
      TEST_DIR,
    );

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.projectName).toBe("my-app");
  });
});
