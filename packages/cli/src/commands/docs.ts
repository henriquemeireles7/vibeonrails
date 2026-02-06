import { Command } from "commander";
import { join } from "node:path";
import { execSync } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import { generateDocs } from "../generators/docs.generator.js";
import { toKebabCase } from "../utils/template.js";

/**
 * `vibe docs` — Documentation site management.
 *
 * Subcommands:
 *   - `vibe docs init [name]` — Scaffold a new docs site
 *   - `vibe docs dev`         — Start docs dev server
 *   - `vibe docs build`       — Build docs for production
 */
export function docsCommand(): Command {
  const docs = new Command("docs").description(
    "Documentation site management",
  );

  docs
    .command("init [name]")
    .description("Scaffold a new documentation site")
    .option("-t, --title <title>", "Site title")
    .option("-d, --description <desc>", "Site description")
    .option("--package <name>", "Package name for install commands")
    .option("--github-org <org>", "GitHub organization")
    .option("--github-repo <repo>", "GitHub repository")
    .action(
      (
        name: string | undefined,
        options: {
          title?: string;
          description?: string;
          package?: string;
          githubOrg?: string;
          githubRepo?: string;
        },
      ) => {
        const projectName = toKebabCase(name ?? "my-project");
        const title = options.title ?? projectName;
        const description =
          options.description ?? `Documentation for ${title}`;

        const spinner = ora("Scaffolding docs site...").start();

        try {
          const result = generateDocs(
            {
              name: projectName,
              title,
              description,
              packageName: options.package,
              githubOrg: options.githubOrg,
              githubRepo: options.githubRepo,
            },
            process.cwd(),
          );

          spinner.succeed("Documentation site scaffolded.");
          console.log(
            chalk.dim(
              `\n  Created ${result.files.length} files in ${result.directory}:\n`,
            ),
          );

          for (const file of result.files) {
            const relative = file.replace(process.cwd() + "/", "");
            console.log(`    ${chalk.green("+")} ${relative}`);
          }

          console.log(
            chalk.cyan("\n  Next steps:"),
          );
          console.log(
            chalk.dim("    cd docs && pnpm install && pnpm dev\n"),
          );
        } catch (error) {
          spinner.fail("Failed to scaffold docs site.");
          console.error(error);
          process.exit(1);
        }
      },
    );

  docs
    .command("dev")
    .description("Start docs development server")
    .option("-p, --port <port>", "Port number", "4321")
    .action((options: { port: string }) => {
      console.log(
        chalk.cyan(
          `\n  Starting docs dev server on port ${options.port}...\n`,
        ),
      );

      const docsDir = join(process.cwd(), "docs");

      try {
        execSync(`npx astro dev --port ${options.port}`, {
          cwd: docsDir,
          stdio: "inherit",
        });
      } catch {
        // User interrupted with Ctrl+C
      }
    });

  docs
    .command("build")
    .description("Build docs for production")
    .action(() => {
      const docsDir = join(process.cwd(), "docs");

      const spinner = ora("Building documentation site...").start();

      try {
        execSync("npx astro build", {
          cwd: docsDir,
          stdio: "inherit",
        });
        spinner.succeed("Documentation built successfully.");
      } catch (error) {
        spinner.fail("Failed to build documentation.");
        console.error(error);
        process.exit(1);
      }
    });

  return docs;
}
