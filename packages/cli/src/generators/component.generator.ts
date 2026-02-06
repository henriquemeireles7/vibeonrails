import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, writeFile } from "../utils/fs.js";
import {
  renderTemplate,
  registerHelpers,
  toPascalCase,
} from "../utils/template.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Resolve the templates/component directory. */
function getTemplatesDir(): string {
  const cliRoot = join(__dirname, "..", "..");
  return join(cliRoot, "templates", "component");
}

export interface GenerateComponentResult {
  componentName: string;
  directory: string;
  files: string[];
}

/**
 * Generate a React component from the component template.
 *
 * @param name - Component name (e.g. "UserCard")
 * @param outputBase - Base directory for output (e.g. "src/components")
 * @returns Information about generated files
 */
export function generateComponent(name: string, outputBase: string): GenerateComponentResult {
  registerHelpers();

  const pascalName = toPascalCase(name);
  const templatesDir = getTemplatesDir();

  const outDir = join(outputBase, pascalName);
  ensureDir(outDir);

  const context = { name };
  const generatedFiles: string[] = [];

  // Component file
  const componentTpl = readFileSync(join(templatesDir, "{{Name}}.tsx.hbs"), "utf-8");
  const componentContent = renderTemplate(componentTpl, context);
  const componentPath = join(outDir, `${pascalName}.tsx`);
  writeFile(componentPath, componentContent);
  generatedFiles.push(componentPath);

  // Test file
  const testTpl = readFileSync(join(templatesDir, "{{Name}}.test.tsx.hbs"), "utf-8");
  const testContent = renderTemplate(testTpl, context);
  const testPath = join(outDir, `${pascalName}.test.tsx`);
  writeFile(testPath, testContent);
  generatedFiles.push(testPath);

  return {
    componentName: pascalName,
    directory: outDir,
    files: generatedFiles,
  };
}
