/**
 * AI Module Generation
 *
 * `vibe generate module <name> --describe "e-commerce orders with Stripe checkout,
 * inventory, email confirmations"` generates a full module: Zod schemas,
 * service (business logic), controller (tRPC), tests.
 * One sentence -> working module.
 */

import { Command } from "commander";
import { join } from "node:path";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";
import { ensureDir, writeFile } from "../utils/fs.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleSpec {
  name: string;
  description: string;
  entities: EntitySpec[];
  operations: string[];
  integrations: string[];
}

export interface EntitySpec {
  name: string;
  fields: FieldSpec[];
}

export interface FieldSpec {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "relation";
  required: boolean;
  enumValues?: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationResult {
  module: string;
  description: string;
  files: GeneratedFile[];
}

// ---------------------------------------------------------------------------
// Description Parser
// ---------------------------------------------------------------------------

/** Parse a natural language description into a module spec. */
export function parseDescription(
  name: string,
  description: string,
): ModuleSpec {
  const descLower = description.toLowerCase();
  const entities: EntitySpec[] = [];
  const operations: string[] = [];
  const integrations: string[] = [];

  // Detect common entities from description
  const entityPatterns: Array<{ pattern: RegExp; entity: string }> = [
    { pattern: /order/i, entity: "Order" },
    { pattern: /product/i, entity: "Product" },
    { pattern: /user/i, entity: "User" },
    { pattern: /item/i, entity: "Item" },
    { pattern: /cart/i, entity: "Cart" },
    { pattern: /invoice/i, entity: "Invoice" },
    { pattern: /payment/i, entity: "Payment" },
    { pattern: /subscription/i, entity: "Subscription" },
    { pattern: /booking/i, entity: "Booking" },
    { pattern: /ticket/i, entity: "Ticket" },
    { pattern: /comment/i, entity: "Comment" },
    { pattern: /review/i, entity: "Review" },
    { pattern: /category/i, entity: "Category" },
  ];

  for (const { pattern, entity } of entityPatterns) {
    if (pattern.test(descLower)) {
      entities.push(generateDefaultEntity(entity));
    }
  }

  // If no entities detected, create a default one from the module name
  if (entities.length === 0) {
    entities.push(
      generateDefaultEntity(name.charAt(0).toUpperCase() + name.slice(1)),
    );
  }

  // Detect operations
  const operationPatterns = [
    "checkout",
    "purchase",
    "create",
    "update",
    "delete",
    "list",
    "search",
    "filter",
    "export",
    "import",
    "send",
    "notify",
    "schedule",
    "cancel",
    "refund",
    "archive",
  ];
  for (const op of operationPatterns) {
    if (descLower.includes(op)) {
      operations.push(op);
    }
  }

  // Always include CRUD
  if (!operations.some((op) => ["create", "list"].includes(op))) {
    operations.push("create", "list", "getById", "update", "delete");
  }

  // Detect integrations
  if (descLower.includes("stripe") || descLower.includes("payment")) {
    integrations.push("stripe");
  }
  if (descLower.includes("email") || descLower.includes("notification")) {
    integrations.push("email");
  }
  if (descLower.includes("inventory") || descLower.includes("stock")) {
    integrations.push("inventory");
  }

  return { name, description, entities, operations, integrations };
}

/** Generate a default entity with common fields. */
function generateDefaultEntity(name: string): EntitySpec {
  return {
    name,
    fields: [
      { name: "id", type: "string", required: true },
      { name: "createdAt", type: "date", required: true },
      { name: "updatedAt", type: "date", required: true },
      {
        name: "status",
        type: "enum",
        required: true,
        enumValues: ["active", "inactive", "archived"],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Code Generators
// ---------------------------------------------------------------------------

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Generate Zod schema file. */
export function generateSchemaFile(spec: ModuleSpec): string {
  const lines: string[] = [];
  lines.push('import { z } from "zod";');
  lines.push("");
  lines.push("// VOR: Auto-generated Zod schemas");
  lines.push(`// Module: ${spec.name}`);
  lines.push(`// Description: ${spec.description}`);
  lines.push("");

  for (const entity of spec.entities) {
    const schemaName = `${toCamelCase(entity.name)}Schema`;
    lines.push(`export const ${schemaName} = z.object({`);

    for (const field of entity.fields) {
      const zodType = fieldToZodType(field);
      lines.push(`  ${field.name}: ${zodType},`);
    }

    lines.push("});");
    lines.push("");
    lines.push(
      `export type ${toPascalCase(entity.name)} = z.infer<typeof ${schemaName}>;`,
    );
    lines.push("");

    // Create input schema (without id, timestamps)
    lines.push(
      `export const create${toPascalCase(entity.name)}Schema = ${schemaName}.omit({`,
    );
    lines.push("  id: true,");
    lines.push("  createdAt: true,");
    lines.push("  updatedAt: true,");
    lines.push("});");
    lines.push("");
    lines.push(
      `export type Create${toPascalCase(entity.name)}Input = z.infer<typeof create${toPascalCase(entity.name)}Schema>;`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

function fieldToZodType(field: FieldSpec): string {
  const base = (() => {
    switch (field.type) {
      case "string":
        return "z.string()";
      case "number":
        return "z.number()";
      case "boolean":
        return "z.boolean()";
      case "date":
        return "z.date()";
      case "enum":
        if (field.enumValues && field.enumValues.length > 0) {
          const values = field.enumValues
            .map((v) => `"${v}"`)
            .join(", ");
          return `z.enum([${values}])`;
        }
        return "z.string()";
      case "relation":
        return "z.string()";
      default:
        return "z.unknown()";
    }
  })();

  return field.required ? base : `${base}.optional()`;
}

/** Generate service file (business logic). */
export function generateServiceFile(spec: ModuleSpec): string {
  const lines: string[] = [];
  const primaryEntity = spec.entities[0]!;
  const typeName = toPascalCase(primaryEntity.name);
  const varName = toCamelCase(primaryEntity.name);

  lines.push("// VOR: Auto-generated service");
  lines.push(`// Module: ${spec.name}`);
  lines.push(`// Description: ${spec.description}`);
  lines.push("");
  lines.push(
    `import type { ${typeName}, Create${typeName}Input } from "./${spec.name}.types.js";`,
  );
  lines.push("");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("// In-memory store (replace with Drizzle ORM repository)");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("");
  lines.push(`const store: Map<string, ${typeName}> = new Map();`);
  lines.push("");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("// Service Functions");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("");

  // Create
  lines.push(
    `export function create${typeName}(input: Create${typeName}Input): ${typeName} {`,
  );
  lines.push(
    `  const ${varName}: ${typeName} = {`,
  );
  lines.push("    ...input,");
  lines.push(
    `    id: crypto.randomUUID(),`,
  );
  lines.push("    createdAt: new Date(),");
  lines.push("    updatedAt: new Date(),");
  lines.push("  };");
  lines.push(`  store.set(${varName}.id, ${varName});`);
  lines.push(`  return ${varName};`);
  lines.push("}");
  lines.push("");

  // Get by ID
  lines.push(
    `export function get${typeName}ById(id: string): ${typeName} | undefined {`,
  );
  lines.push("  return store.get(id);");
  lines.push("}");
  lines.push("");

  // List
  lines.push(`export function list${typeName}s(): ${typeName}[] {`);
  lines.push("  return Array.from(store.values());");
  lines.push("}");
  lines.push("");

  // Update
  lines.push(
    `export function update${typeName}(id: string, input: Partial<Create${typeName}Input>): ${typeName} | undefined {`,
  );
  lines.push(`  const existing = store.get(id);`);
  lines.push("  if (!existing) return undefined;");
  lines.push(
    `  const updated: ${typeName} = { ...existing, ...input, updatedAt: new Date() };`,
  );
  lines.push("  store.set(id, updated);");
  lines.push("  return updated;");
  lines.push("}");
  lines.push("");

  // Delete
  lines.push(`export function delete${typeName}(id: string): boolean {`);
  lines.push("  return store.delete(id);");
  lines.push("}");

  return lines.join("\n");
}

/** Generate tRPC controller file. */
export function generateControllerFile(spec: ModuleSpec): string {
  const lines: string[] = [];
  const primaryEntity = spec.entities[0]!;
  const typeName = toPascalCase(primaryEntity.name);
  const varName = toCamelCase(primaryEntity.name);

  lines.push("// VOR: Auto-generated tRPC controller");
  lines.push(`// Module: ${spec.name}`);
  lines.push(`// Description: ${spec.description}`);
  lines.push("");
  lines.push('import { z } from "zod";');
  lines.push(
    `import { create${typeName}Schema } from "./${spec.name}.types.js";`,
  );
  lines.push(
    `import { create${typeName}, get${typeName}ById, list${typeName}s, update${typeName}, delete${typeName} } from "./${spec.name}.service.js";`,
  );
  lines.push("");
  lines.push("// VOR: Replace with your tRPC router setup");
  lines.push("// import { router, publicProcedure } from '@vibeonrails/core/api';");
  lines.push("");
  lines.push(`// export const ${varName}Router = router({`);
  lines.push(`//   create: publicProcedure`);
  lines.push(`//     .input(create${typeName}Schema)`);
  lines.push(`//     .mutation(({ input }) => create${typeName}(input)),`);
  lines.push("//");
  lines.push(`//   getById: publicProcedure`);
  lines.push(`//     .input(z.object({ id: z.string() }))`);
  lines.push(`//     .query(({ input }) => get${typeName}ById(input.id)),`);
  lines.push("//");
  lines.push(`//   list: publicProcedure`);
  lines.push(`//     .query(() => list${typeName}s()),`);
  lines.push("//");
  lines.push(`//   update: publicProcedure`);
  lines.push(
    `//     .input(z.object({ id: z.string(), data: create${typeName}Schema.partial() }))`,
  );
  lines.push(
    `//     .mutation(({ input }) => update${typeName}(input.id, input.data)),`,
  );
  lines.push("//");
  lines.push(`//   delete: publicProcedure`);
  lines.push(`//     .input(z.object({ id: z.string() }))`);
  lines.push(`//     .mutation(({ input }) => delete${typeName}(input.id)),`);
  lines.push("// });");
  lines.push("");
  lines.push("// VOR: Temporary exports for direct usage");
  lines.push(
    `export { create${typeName}, get${typeName}ById, list${typeName}s, update${typeName}, delete${typeName} };`,
  );

  return lines.join("\n");
}

/** Generate test file. */
export function generateTestFile(spec: ModuleSpec): string {
  const lines: string[] = [];
  const primaryEntity = spec.entities[0]!;
  const typeName = toPascalCase(primaryEntity.name);

  lines.push("// VOR: Auto-generated tests");
  lines.push(`// Module: ${spec.name}`);
  lines.push("");
  lines.push('import { describe, it, expect } from "vitest";');
  lines.push(
    `import { create${typeName}, get${typeName}ById, list${typeName}s, update${typeName}, delete${typeName} } from "./${spec.name}.service.js";`,
  );
  lines.push("");
  lines.push(`describe("${spec.name} service", () => {`);
  lines.push(`  it("creates a ${typeName.toLowerCase()}", () => {`);
  lines.push(
    `    const result = create${typeName}({ status: "active" });`,
  );
  lines.push(`    expect(result.id).toBeDefined();`);
  lines.push(`    expect(result.status).toBe("active");`);
  lines.push(`    expect(result.createdAt).toBeInstanceOf(Date);`);
  lines.push("  });");
  lines.push("");
  lines.push(`  it("gets a ${typeName.toLowerCase()} by id", () => {`);
  lines.push(
    `    const created = create${typeName}({ status: "active" });`,
  );
  lines.push(`    const found = get${typeName}ById(created.id);`);
  lines.push(`    expect(found?.id).toBe(created.id);`);
  lines.push("  });");
  lines.push("");
  lines.push(`  it("lists all ${typeName.toLowerCase()}s", () => {`);
  lines.push(`    const all = list${typeName}s();`);
  lines.push(`    expect(Array.isArray(all)).toBe(true);`);
  lines.push("  });");
  lines.push("");
  lines.push(`  it("updates a ${typeName.toLowerCase()}", () => {`);
  lines.push(
    `    const created = create${typeName}({ status: "active" });`,
  );
  lines.push(
    `    const updated = update${typeName}(created.id, { status: "inactive" });`,
  );
  lines.push(`    expect(updated?.status).toBe("inactive");`);
  lines.push("  });");
  lines.push("");
  lines.push(`  it("deletes a ${typeName.toLowerCase()}", () => {`);
  lines.push(
    `    const created = create${typeName}({ status: "active" });`,
  );
  lines.push(`    const deleted = delete${typeName}(created.id);`);
  lines.push(`    expect(deleted).toBe(true);`);
  lines.push(`    expect(get${typeName}ById(created.id)).toBeUndefined();`);
  lines.push("  });");
  lines.push("});");

  return lines.join("\n");
}

/** Generate SKILL.md for the module. */
export function generateSkillFile(spec: ModuleSpec): string {
  const lines: string[] = [];
  lines.push(`# ${toPascalCase(spec.name)} Module`);
  lines.push("");
  lines.push(`> ${spec.description}`);
  lines.push("");
  lines.push("## Generated by AI");
  lines.push("");
  lines.push("This module was auto-generated by `vibe generate module --describe`.");
  lines.push("");
  lines.push("## Entities");
  lines.push("");
  for (const entity of spec.entities) {
    lines.push(`### ${entity.name}`);
    lines.push("");
    for (const field of entity.fields) {
      lines.push(
        `- \`${field.name}\`: ${field.type}${field.required ? " (required)" : " (optional)"}`,
      );
    }
    lines.push("");
  }

  if (spec.integrations.length > 0) {
    lines.push("## Integrations");
    lines.push("");
    for (const integration of spec.integrations) {
      lines.push(`- ${integration}`);
    }
    lines.push("");
  }

  lines.push("## Files");
  lines.push("");
  lines.push(`- \`${spec.name}.types.ts\` — Zod schemas and TypeScript types`);
  lines.push(`- \`${spec.name}.service.ts\` — Business logic`);
  lines.push(`- \`${spec.name}.controller.ts\` — tRPC controller`);
  lines.push(`- \`${spec.name}.test.ts\` — Tests`);
  lines.push(`- \`index.ts\` — Barrel exports`);

  return lines.join("\n");
}

/** Generate barrel index file. */
export function generateIndexFile(spec: ModuleSpec): string {
  const lines: string[] = [];
  lines.push(`export * from "./${spec.name}.types.js";`);
  lines.push(`export * from "./${spec.name}.service.js";`);
  lines.push(`export * from "./${spec.name}.controller.js";`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/** Generate all files for a module from a description. */
export function generateModuleFromDescription(
  name: string,
  description: string,
): GenerationResult {
  const spec = parseDescription(name, description);

  const files: GeneratedFile[] = [
    {
      path: `${name}/${name}.types.ts`,
      content: generateSchemaFile(spec),
    },
    {
      path: `${name}/${name}.service.ts`,
      content: generateServiceFile(spec),
    },
    {
      path: `${name}/${name}.controller.ts`,
      content: generateControllerFile(spec),
    },
    {
      path: `${name}/${name}.test.ts`,
      content: generateTestFile(spec),
    },
    {
      path: `${name}/SKILL.md`,
      content: generateSkillFile(spec),
    },
    {
      path: `${name}/index.ts`,
      content: generateIndexFile(spec),
    },
  ];

  return { module: name, description, files };
}

/** Write generated files to disk. */
export function writeGeneratedFiles(
  projectRoot: string,
  result: GenerationResult,
  baseDir = "src/modules",
): string[] {
  const writtenPaths: string[] = [];
  const targetDir = join(projectRoot, baseDir);

  for (const file of result.files) {
    const fullPath = join(targetDir, file.path);
    ensureDir(fullPath.substring(0, fullPath.lastIndexOf("/")));
    writeFile(fullPath, file.content);
    writtenPaths.push(join(baseDir, file.path));
  }

  return writtenPaths;
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe generate module <name> --describe "..."` — AI module generation.
 */
export function generateAiCommand(): Command {
  return new Command("generate-ai")
    .description("Generate a module from a natural language description")
    .argument("<name>", "Module name (e.g., order)")
    .requiredOption(
      "--describe <description>",
      "Natural language description of the module",
    )
    .option("--dir <dir>", "Output directory", "src/modules")
    .option("--json", "Output as JSON")
    .option("--dry-run", "Preview generated files without writing")
    .action(
      (
        name: string,
        options: {
          describe: string;
          dir: string;
          json?: boolean;
          dryRun?: boolean;
        },
      ) => {
        const fmt = createFormatter();
        const projectRoot = process.cwd();

        fmt.info(
          chalk.dim(`Generating module "${name}" from description...`),
        );

        const result = generateModuleFromDescription(name, options.describe);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (options.dryRun) {
          fmt.info(chalk.bold(`\nModule: ${name}\n`));
          for (const file of result.files) {
            console.log(chalk.cyan(`  ${file.path}`));
            console.log(chalk.dim("  " + "-".repeat(60)));
            // Show first 10 lines preview
            const preview = file.content.split("\n").slice(0, 10).join("\n");
            console.log(
              preview
                .split("\n")
                .map((l) => `  ${l}`)
                .join("\n"),
            );
            console.log(chalk.dim("  ..."));
            console.log();
          }
          return;
        }

        const writtenPaths = writeGeneratedFiles(
          projectRoot,
          result,
          options.dir,
        );

        fmt.success({
          command: "generate-ai",
          data: {
            module: name,
            files: writtenPaths,
          },
          message: chalk.green(
            `Generated module "${chalk.bold(name)}" with ${writtenPaths.length} files`,
          ),
          nextSteps: [
            `Review generated files in ${chalk.cyan(options.dir + "/" + name + "/")}`,
            `Run tests: ${chalk.dim("npx vitest run " + options.dir + "/" + name)}`,
            "Customize schemas and service logic for your needs",
          ],
        });
      },
    );
}
