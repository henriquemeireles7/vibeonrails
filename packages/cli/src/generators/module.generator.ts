import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, writeFile } from "../utils/fs.js";
import {
  renderTemplate,
  registerHelpers,
  toKebabCase,
} from "../utils/template.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Resolve the templates/module directory (relative to compiled output). */
function getTemplatesDir(): string {
  // In dev / test: packages/cli/templates/module
  // Walk up from src/generators → cli root
  const cliRoot = join(__dirname, "..", "..");
  return join(cliRoot, "templates", "module");
}

export interface GenerateModuleResult {
  moduleName: string;
  directory: string;
  files: string[];
}

/**
 * Generate a full module (types, service, controller, test, index) from templates.
 *
 * @param name   The module name (e.g. "user", "blog-post")
 * @param outDir The parent directory to create the module folder in (e.g. "src/modules")
 */
export function generateModule(
  name: string,
  outDir: string,
): GenerateModuleResult {
  registerHelpers();

  const kebabName = toKebabCase(name);
  const moduleDir = join(outDir, kebabName);
  ensureDir(moduleDir);

  const templatesDir = getTemplatesDir();
  const templateFiles = readdirSync(templatesDir).filter((f) =>
    f.endsWith(".hbs"),
  );

  const data = { name: kebabName };
  const generatedFiles: string[] = [];

  /** Map template file names → output file names */
  const nameMap: Record<string, string> = {
    "types.ts.hbs": "types.ts",
    "service.ts.hbs": `${kebabName}.service.ts`,
    "controller.ts.hbs": `${kebabName}.controller.ts`,
    "service.test.ts.hbs": `${kebabName}.service.test.ts`,
    "index.ts.hbs": "index.ts",
    "SKILL.md.hbs": "SKILL.md",
  };

  for (const templateFile of templateFiles) {
    const outputName = nameMap[templateFile];
    if (!outputName) continue;

    const templateContent = readFileSync(
      join(templatesDir, templateFile),
      "utf-8",
    );
    const rendered = renderTemplate(templateContent, data);
    const outputPath = join(moduleDir, outputName);
    writeFile(outputPath, rendered);
    generatedFiles.push(outputPath);
  }

  return {
    moduleName: kebabName,
    directory: moduleDir,
    files: generatedFiles,
  };
}
