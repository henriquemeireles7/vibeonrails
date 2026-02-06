import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, writeFile } from "../utils/fs.js";
import { renderTemplate, registerHelpers } from "../utils/template.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Resolve the @vibeonrails/docs templates directory. */
function getDocsTemplatesDir(): string {
  // Try the local monorepo path first
  const cliRoot = join(__dirname, "..", "..");
  const monorepoPath = join(cliRoot, "..", "docs", "templates", "docs-site");
  try {
    if (statSync(monorepoPath).isDirectory()) {
      return monorepoPath;
    }
  } catch {
    // fall through
  }

  // Try node_modules
  const nodeModulesPath = join(
    cliRoot,
    "node_modules",
    "@vibeonrails",
    "docs",
    "templates",
    "docs-site",
  );
  return nodeModulesPath;
}

export interface GenerateDocsResult {
  projectName: string;
  directory: string;
  files: string[];
}

export interface GenerateDocsOptions {
  /** Project / docs site name. */
  name: string;
  /** Display title for the documentation site. */
  title: string;
  /** Short description for meta tags. */
  description: string;
  /** Package name (e.g. "@myorg/core") for install commands. */
  packageName?: string;
  /** GitHub org name. */
  githubOrg?: string;
  /** GitHub repo name. */
  githubRepo?: string;
}

/**
 * Generate a documentation site from the @vibeonrails/docs template.
 *
 * Walks the template directory, renders .hbs files with Handlebars,
 * and copies non-.hbs files as-is.
 *
 * @param options - Docs site configuration
 * @param outDir - Parent directory to create the docs folder in
 */
export function generateDocs(
  options: GenerateDocsOptions,
  outDir: string,
): GenerateDocsResult {
  registerHelpers();

  const docsDir = join(outDir, "docs");
  ensureDir(docsDir);

  const templatesDir = getDocsTemplatesDir();
  const generatedFiles: string[] = [];

  const data: Record<string, unknown> = {
    name: options.name,
    title: options.title,
    description: options.description,
    packageName: options.packageName ?? options.name,
    githubOrg: options.githubOrg ?? "your-org",
    githubRepo: options.githubRepo ?? options.name,
  };

  // Recursively walk and render templates
  walkAndRender(templatesDir, docsDir, data, generatedFiles);

  return {
    projectName: options.name,
    directory: docsDir,
    files: generatedFiles,
  };
}

/** Recursively walk a directory, render .hbs files, copy the rest. */
function walkAndRender(
  srcDir: string,
  destDir: string,
  data: Record<string, unknown>,
  files: string[],
): void {
  let entries: string[];
  try {
    entries = readdirSync(srcDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      const destSubDir = join(destDir, entry);
      ensureDir(destSubDir);
      walkAndRender(srcPath, destSubDir, data, files);
    } else if (entry.endsWith(".hbs")) {
      // Render Handlebars template
      const outputName = entry.replace(/\.hbs$/, "");
      const outputPath = join(destDir, outputName);
      const templateContent = readFileSync(srcPath, "utf-8");
      const rendered = renderTemplate(templateContent, data);
      writeFile(outputPath, rendered);
      files.push(outputPath);
    } else {
      // Copy as-is
      const outputPath = join(destDir, entry);
      const content = readFileSync(srcPath, "utf-8");
      writeFile(outputPath, content);
      files.push(outputPath);
    }
  }
}
