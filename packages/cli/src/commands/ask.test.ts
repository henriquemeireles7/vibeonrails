import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  findSkillFiles,
  getInstalledModules,
  getConfigSummary,
  loadProjectContext,
  buildSystemPrompt,
  generateLocalAnswer,
} from "./ask.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `vibe-ask-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("vibe ask", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = makeTmpDir();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // Context Loading
  // -----------------------------------------------------------------------

  describe("findSkillFiles", () => {
    it("finds SKILL.md files recursively", () => {
      mkdirSync(join(projectRoot, "src/modules/auth"), { recursive: true });
      writeFileSync(join(projectRoot, "SKILL.md"), "# Root Skill");
      writeFileSync(
        join(projectRoot, "src/modules/auth/SKILL.md"),
        "# Auth Skill",
      );

      const skills = findSkillFiles(projectRoot);
      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.path)).toContain("SKILL.md");
      expect(skills.map((s) => s.path)).toContain(
        "src/modules/auth/SKILL.md",
      );
    });

    it("skips node_modules and dist", () => {
      mkdirSync(join(projectRoot, "node_modules/pkg"), { recursive: true });
      mkdirSync(join(projectRoot, "dist"), { recursive: true });
      writeFileSync(
        join(projectRoot, "node_modules/pkg/SKILL.md"),
        "# Skip",
      );
      writeFileSync(join(projectRoot, "dist/SKILL.md"), "# Skip");

      const skills = findSkillFiles(projectRoot);
      expect(skills).toHaveLength(0);
    });

    it("respects max depth", () => {
      const deepDir = join(projectRoot, "a/b/c/d/e/f");
      mkdirSync(deepDir, { recursive: true });
      writeFileSync(join(deepDir, "SKILL.md"), "# Deep");

      const skills = findSkillFiles(projectRoot, 3);
      expect(skills).toHaveLength(0);
    });

    it("truncates long SKILL.md content", () => {
      const longContent = "x".repeat(5000);
      writeFileSync(join(projectRoot, "SKILL.md"), longContent);

      const skills = findSkillFiles(projectRoot);
      expect(skills[0]!.content.length).toBeLessThanOrEqual(2000);
    });
  });

  describe("getInstalledModules", () => {
    it("detects @vibeonrails packages from both deps and devDeps", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({
          dependencies: { "@vibeonrails/core": "^1.0.0" },
          devDependencies: { "@vibeonrails/cli": "^1.0.0" },
        }),
      );

      const modules = getInstalledModules(projectRoot);
      expect(modules).toContain("@vibeonrails/core");
      expect(modules).toContain("@vibeonrails/cli");
    });

    it("returns empty array without package.json", () => {
      expect(getInstalledModules(projectRoot)).toEqual([]);
    });
  });

  describe("getConfigSummary", () => {
    it("reads vibe.config.ts content", () => {
      writeFileSync(
        join(projectRoot, "vibe.config.ts"),
        'export default { name: "my-app" };',
      );

      const summary = getConfigSummary(projectRoot);
      expect(summary).toContain("my-app");
    });

    it("returns null when no config exists", () => {
      expect(getConfigSummary(projectRoot)).toBeNull();
    });
  });

  describe("loadProjectContext", () => {
    it("loads all context fields", () => {
      writeFileSync(
        join(projectRoot, "package.json"),
        JSON.stringify({
          name: "test-app",
          dependencies: { "@vibeonrails/core": "^1.0.0" },
        }),
      );
      writeFileSync(join(projectRoot, "SKILL.md"), "# Project Skill");

      const ctx = loadProjectContext(projectRoot);
      expect(ctx.projectName).toBe("test-app");
      expect(ctx.installedModules).toContain("@vibeonrails/core");
      expect(ctx.skillFiles).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Prompt Building
  // -----------------------------------------------------------------------

  describe("buildSystemPrompt", () => {
    it("includes project name", () => {
      const prompt = buildSystemPrompt({
        projectName: "my-saas",
        installedModules: [],
        skillFiles: [],
        configSummary: null,
      });
      expect(prompt).toContain("my-saas");
    });

    it("lists installed modules", () => {
      const prompt = buildSystemPrompt({
        projectName: "app",
        installedModules: ["@vibeonrails/core", "@vibeonrails/payments"],
        skillFiles: [],
        configSummary: null,
      });
      expect(prompt).toContain("@vibeonrails/core");
      expect(prompt).toContain("@vibeonrails/payments");
    });

    it("includes SKILL.md contents", () => {
      const prompt = buildSystemPrompt({
        projectName: "app",
        installedModules: [],
        skillFiles: [{ path: "SKILL.md", content: "# My Framework Skill" }],
        configSummary: null,
      });
      expect(prompt).toContain("My Framework Skill");
    });

    it("includes config summary", () => {
      const prompt = buildSystemPrompt({
        projectName: "app",
        installedModules: [],
        skillFiles: [],
        configSummary: 'export default { auth: { providers: ["google"] } };',
      });
      expect(prompt).toContain("google");
    });
  });

  // -----------------------------------------------------------------------
  // Local Answer Generation
  // -----------------------------------------------------------------------

  describe("generateLocalAnswer", () => {
    it("returns relevant SKILL.md excerpts for matching keywords", () => {
      const result = generateLocalAnswer("How do I add payments?", {
        projectName: "app",
        installedModules: [],
        skillFiles: [
          {
            path: "packages/payments/SKILL.md",
            content: "# Payments\n\nStripe checkout, subscriptions, webhooks.",
          },
        ],
        configSummary: null,
      });

      expect(result.answer).toContain("payments/SKILL.md");
      expect(result.question).toBe("How do I add payments?");
    });

    it("suggests payment command for payment questions", () => {
      const result = generateLocalAnswer("How do I add payment support?", {
        projectName: "app",
        installedModules: [],
        skillFiles: [],
        configSummary: null,
      });

      expect(result.answer).toContain("npx vibe add payments");
    });

    it("suggests marketing command for marketing questions", () => {
      const result = generateLocalAnswer("How do I set up marketing?", {
        projectName: "app",
        installedModules: [],
        skillFiles: [],
        configSummary: null,
      });

      expect(result.answer).toContain("npx vibe add marketing");
    });

    it("suggests module generation for generate questions", () => {
      const result = generateLocalAnswer("How do I generate a new module?", {
        projectName: "app",
        installedModules: [],
        skillFiles: [],
        configSummary: null,
      });

      expect(result.answer).toContain("npx vibe generate module");
    });

    it("includes installed modules in the answer", () => {
      const result = generateLocalAnswer("What modules do I have?", {
        projectName: "app",
        installedModules: ["@vibeonrails/core", "@vibeonrails/payments"],
        skillFiles: [],
        configSummary: null,
      });

      expect(result.answer).toContain("@vibeonrails/core");
      expect(result.context.modulesUsed).toContain("@vibeonrails/payments");
    });

    it("tracks context metadata", () => {
      const result = generateLocalAnswer("test question", {
        projectName: "app",
        installedModules: ["@vibeonrails/core"],
        skillFiles: [{ path: "SKILL.md", content: "skill content" }],
        configSummary: null,
      });

      expect(result.context.skillFilesRead).toBe(1);
      expect(result.context.modulesUsed).toHaveLength(1);
    });
  });
});
