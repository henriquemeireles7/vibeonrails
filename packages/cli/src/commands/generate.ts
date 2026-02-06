import { Command } from "commander";
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { generateModule } from "../generators/module.generator.js";
import { generateComponent } from "../generators/component.generator.js";
import { toKebabCase, toPascalCase } from "../utils/template.js";

/**
 * `vibe generate module <name>` — Generate a new module (types, service, controller, test).
 */
export function generateCommand(): Command {
  const generate = new Command("generate")
    .alias("g")
    .description("Generate code from templates");

  generate
    .command("module <name>")
    .alias("m")
    .description("Generate a new module (types, service, controller, test)")
    .option("-d, --dir <dir>", "Output directory", "src/modules")
    .action((name: string, options: { dir: string }) => {
      const kebabName = toKebabCase(name);
      const outDir = join(process.cwd(), options.dir);

      const spinner = ora(`Generating module "${kebabName}"...`).start();

      try {
        const result = generateModule(name, outDir);

        spinner.succeed(`Module "${kebabName}" generated.`);
        console.log(
          chalk.dim(`\n  Created ${result.files.length} files in ${result.directory}:\n`),
        );

        for (const file of result.files) {
          const relative = file.replace(process.cwd() + "/", "");
          console.log(`    ${chalk.green("+")} ${relative}`);
        }

        console.log();
      } catch (error) {
        spinner.fail(`Failed to generate module "${kebabName}".`);
        console.error(error);
        process.exit(1);
      }
    });

  generate
    .command("component <name>")
    .alias("c")
    .description("Generate a new React component with test file")
    .option("-d, --dir <dir>", "Output directory", "src/components")
    .action((name: string, options: { dir: string }) => {
      const pascalName = toPascalCase(name);
      const outDir = join(process.cwd(), options.dir);

      const spinner = ora(`Generating component "${pascalName}"...`).start();

      try {
        const result = generateComponent(name, outDir);

        spinner.succeed(`Component "${pascalName}" generated.`);
        console.log(
          chalk.dim(`\n  Created ${result.files.length} files in ${result.directory}:\n`),
        );

        for (const file of result.files) {
          const relative = file.replace(process.cwd() + "/", "");
          console.log(`    ${chalk.green("+")} ${relative}`);
        }

        console.log();
      } catch (error) {
        spinner.fail(`Failed to generate component "${pascalName}".`);
        console.error(error);
        process.exit(1);
      }
    });

  return generate;
}
