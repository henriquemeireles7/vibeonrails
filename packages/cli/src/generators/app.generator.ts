import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, copyDir, replaceInFile } from "../utils/fs.js";
import { toKebabCase } from "../utils/template.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Resolve the templates/app directory. */
function getAppTemplateDir(): string {
  const cliRoot = join(__dirname, "..", "..");
  return join(cliRoot, "templates", "app");
}

export interface GenerateAppResult {
  projectName: string;
  directory: string;
  files: string[];
}

/**
 * Scaffold a new Vibe on Rails project from the app template.
 *
 * @param name   The project name (e.g. "my-app", "MyApp")
 * @param outDir The parent directory to create the project folder in
 */
export function generateApp(name: string, outDir: string): GenerateAppResult {
  const projectName = toKebabCase(name);
  const projectDir = join(outDir, projectName);

  ensureDir(projectDir);

  // Copy the entire app template
  const templateDir = getAppTemplateDir();
  copyDir(templateDir, projectDir);

  // Replace {{projectName}} in key files
  const filesToPatch = [
    "package.json",
    "README.md",
    ".env.example",
    ".cursorrules",
    "SKILL.md",
    "src/main.ts",
    "src/config/app.ts",
  ];

  for (const file of filesToPatch) {
    const filePath = join(projectDir, file);
    try {
      replaceInFile(filePath, "{{projectName}}", projectName);
    } catch {
      // File may not exist — skip
    }
  }

  // Collect all generated files
  const files = collectFiles(projectDir);

  return {
    projectName,
    directory: projectDir,
    files,
  };
}

/** Recursively collect all file paths in a directory. */
function collectFiles(dir: string): string[] {
  const result: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      result.push(...collectFiles(fullPath));
    } else {
      result.push(fullPath);
    }
  }

  return result;
}
