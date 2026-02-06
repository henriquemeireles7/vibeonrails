/**
 * Natural Language Interface
 *
 * `vibe ask "How do I add payments?"` — reads SKILL.md + project.json + installed
 * modules and answers with exact steps for THIS project. Context-aware, not
 * generic docs. Uses AI SDK for generation.
 */

import { Command } from "commander";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectContext {
  projectName: string;
  installedModules: string[];
  skillFiles: Array<{ path: string; content: string }>;
  configSummary: string | null;
}

export interface AskResult {
  question: string;
  answer: string;
  context: {
    modulesUsed: string[];
    skillFilesRead: number;
  };
}

// ---------------------------------------------------------------------------
// Context Loading
// ---------------------------------------------------------------------------

/** Recursively find all SKILL.md files in a directory. */
export function findSkillFiles(
  rootDir: string,
  maxDepth = 4,
): Array<{ path: string; content: string }> {
  const skills: Array<{ path: string; content: string }> = [];

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return;
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry === "node_modules" || entry === ".git" || entry === "dist") {
          continue;
        }

        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (entry === "SKILL.md") {
            const content = readFileSync(fullPath, "utf-8");
            skills.push({
              path: relative(rootDir, fullPath),
              content: content.slice(0, 2000), // Truncate for context window
            });
          }
        } catch {
          // Skip unreadable entries
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  walk(rootDir, 0);
  return skills;
}

/** Detect installed VoR modules from package.json. */
export function getInstalledModules(projectRoot: string): string[] {
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    return Object.keys(allDeps).filter((d) => d.startsWith("@vibeonrails/"));
  } catch {
    return [];
  }
}

/** Get a summary of the project config (vibe.config.ts). */
export function getConfigSummary(projectRoot: string): string | null {
  const configPaths = ["vibe.config.ts", "vibe.config.js"];
  for (const name of configPaths) {
    const configPath = join(projectRoot, name);
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf-8");
      return content.slice(0, 1000); // Truncate for context
    }
  }
  return null;
}

/** Load full project context for answering questions. */
export function loadProjectContext(projectRoot: string): ProjectContext {
  const pkgPath = join(projectRoot, "package.json");
  let projectName = "project";
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
        name?: string;
      };
      projectName = pkg.name ?? "project";
    } catch {
      // Use default
    }
  }

  return {
    projectName,
    installedModules: getInstalledModules(projectRoot),
    skillFiles: findSkillFiles(projectRoot),
    configSummary: getConfigSummary(projectRoot),
  };
}

// ---------------------------------------------------------------------------
// Answer Generation
// ---------------------------------------------------------------------------

/** Build a system prompt from project context. */
export function buildSystemPrompt(context: ProjectContext): string {
  const lines: string[] = [];

  lines.push("You are a Vibe on Rails (VoR) project assistant.");
  lines.push(`The project is called "${context.projectName}".`);
  lines.push("");

  if (context.installedModules.length > 0) {
    lines.push("Installed VoR modules:");
    for (const mod of context.installedModules) {
      lines.push(`- ${mod}`);
    }
    lines.push("");
  } else {
    lines.push("No VoR modules are currently installed.");
    lines.push("");
  }

  if (context.configSummary) {
    lines.push("Project configuration (vibe.config.ts):");
    lines.push("```");
    lines.push(context.configSummary);
    lines.push("```");
    lines.push("");
  }

  if (context.skillFiles.length > 0) {
    lines.push("SKILL.md files found in the project:");
    for (const skill of context.skillFiles.slice(0, 10)) {
      lines.push(`\n--- ${skill.path} ---`);
      lines.push(skill.content);
    }
    lines.push("");
  }

  lines.push("Answer questions specifically for THIS project.");
  lines.push("Reference installed modules and available features.");
  lines.push("Provide exact CLI commands and code examples when relevant.");
  lines.push("Be concise but complete. Use markdown formatting.");

  return lines.join("\n");
}

/**
 * Generate a context-aware answer without AI (fallback mode).
 * This searches SKILL.md files and provides relevant excerpts.
 */
export function generateLocalAnswer(
  question: string,
  context: ProjectContext,
): AskResult {
  const questionLower = question.toLowerCase();
  const relevantSkills: Array<{ path: string; content: string }> = [];

  // Simple keyword matching against SKILL.md contents
  for (const skill of context.skillFiles) {
    const contentLower = skill.content.toLowerCase();
    const words = questionLower
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length > 3);
    const matches = words.filter((w) => contentLower.includes(w));
    if (matches.length > 0) {
      relevantSkills.push(skill);
    }
  }

  const lines: string[] = [];

  if (relevantSkills.length > 0) {
    lines.push(`Found ${relevantSkills.length} relevant SKILL.md file(s):\n`);
    for (const skill of relevantSkills.slice(0, 5)) {
      lines.push(`### ${skill.path}\n`);
      lines.push(skill.content.slice(0, 500));
      lines.push("\n---\n");
    }
  } else {
    lines.push("No directly matching documentation found in SKILL.md files.\n");
  }

  if (context.installedModules.length > 0) {
    lines.push("\n**Installed modules:**");
    for (const mod of context.installedModules) {
      lines.push(`- ${mod}`);
    }
  }

  // Suggest common commands based on keywords
  if (questionLower.includes("payment") || questionLower.includes("stripe")) {
    lines.push("\n**Suggested:**");
    lines.push("```bash");
    lines.push("npx vibe add payments");
    lines.push("```");
  } else if (questionLower.includes("marketing") || questionLower.includes("content")) {
    lines.push("\n**Suggested:**");
    lines.push("```bash");
    lines.push("npx vibe add marketing");
    lines.push("```");
  } else if (questionLower.includes("support") || questionLower.includes("ticket")) {
    lines.push("\n**Suggested:**");
    lines.push("```bash");
    lines.push("npx vibe add support-chat");
    lines.push("```");
  } else if (questionLower.includes("module") || questionLower.includes("generate")) {
    lines.push("\n**Suggested:**");
    lines.push("```bash");
    lines.push('npx vibe generate module <name>');
    lines.push("```");
  }

  return {
    question,
    answer: lines.join("\n"),
    context: {
      modulesUsed: context.installedModules,
      skillFilesRead: context.skillFiles.length,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe ask` — Natural language interface for project-specific help.
 */
export function askCommand(): Command {
  return new Command("ask")
    .description("Ask a question about your project — context-aware answers")
    .argument("<question...>", "Your question (e.g., 'How do I add payments?')")
    .option("--json", "Output as JSON")
    .option("--context", "Show loaded context (SKILL.md files, modules)")
    .action((questionParts: string[], options: { json?: boolean; context?: boolean }) => {
      const fmt = createFormatter();
      const projectRoot = process.cwd();
      const question = questionParts.join(" ");

      fmt.info(chalk.dim("Loading project context..."));
      const projectContext = loadProjectContext(projectRoot);

      if (options.context) {
        console.log(chalk.bold("\nProject Context:\n"));
        console.log(`  Project: ${projectContext.projectName}`);
        console.log(`  Modules: ${projectContext.installedModules.join(", ") || "none"}`);
        console.log(`  SKILL.md files: ${projectContext.skillFiles.length}`);
        if (projectContext.configSummary) {
          console.log("  Config: found");
        }
        console.log();
      }

      // Generate answer (local fallback - AI integration via @vibeonrails/ai)
      const result = generateLocalAnswer(question, projectContext);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold.cyan(`\n  Q: ${question}\n`));
      console.log(result.answer);
      console.log();

      if (result.context.skillFilesRead === 0) {
        fmt.info(
          chalk.dim(
            "Tip: Add SKILL.md files to your project folders for better answers.",
          ),
        );
      }
    });
}
