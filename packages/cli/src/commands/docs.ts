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
 *   - `vibe docs init [name]`   — Scaffold a new docs site
 *   - `vibe docs dev`           — Start docs dev server
 *   - `vibe docs build`         — Build docs for production
 *   - `vibe docs generate`      — AI-generate documentation from codebase
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

  docs
    .command("generate")
    .description("AI-generate documentation pages from your codebase")
    .option("--package <name>", "Generate docs for a specific package (e.g., core, infra)")
    .option("--type <type>", "Generate only a specific doc type (guide, reference, tutorial)")
    .option("--page <path>", "Regenerate a single page (e.g., guides/database/schema)")
    .option("--dry-run", "Preview what would be generated without writing files")
    .option("--force", "Overwrite existing files (default: skip existing)")
    .option("--model <model>", "Anthropic model to use (default: claude-sonnet-4-20250514)")
    .action(
      async (options: {
        package?: string;
        type?: string;
        page?: string;
        dryRun?: boolean;
        force?: boolean;
        model?: string;
      }) => {
        const rootDir = process.cwd();

        console.log(chalk.cyan("\n  Vibe Docs Generator (AI-powered)\n"));

        if (!process.env["ANTHROPIC_API_KEY"] && !options.dryRun) {
          console.error(
            chalk.red("  Error: ANTHROPIC_API_KEY environment variable is required.\n"),
          );
          console.log(
            chalk.dim("  Set it in your environment or .env file:"),
          );
          console.log(
            chalk.dim("    export ANTHROPIC_API_KEY=sk-ant-...\n"),
          );
          process.exit(1);
        }

        // Dynamic import to avoid loading heavy deps when not needed.
        // Types are inlined here to avoid a build-time dependency on @vibeonrails/docs.
        interface ProgressEvent {
          phase: string;
          current: number;
          total: number;
          message: string;
        }
        interface GenerateResult {
          pagesGenerated: string[];
          pagesSkipped: string[];
          pagesFailed: string[];
          warnings: string[];
          durationMs: number;
        }

        let generatorModule: {
          generate: (opts: Record<string, unknown>) => Promise<GenerateResult>;
        };

        try {
          // Dynamic import: @vibeonrails/docs must be installed in the user's project.
          // Uses Function() to prevent bundlers from trying to resolve the specifier at build time.
          generatorModule = await Function('specifier', 'return import(specifier)')("@vibeonrails/docs/generator");
        } catch {
          console.error(
            chalk.red("  Error: @vibeonrails/docs package not found.\n"),
          );
          console.log(
            chalk.dim("  Install it: pnpm add @vibeonrails/docs\n"),
          );
          console.log(
            chalk.dim("  The generator also requires optional deps:"),
          );
          console.log(
            chalk.dim("    pnpm add ts-morph @anthropic-ai/sdk handlebars\n"),
          );
          process.exit(1);
        }

        const spinner = ora("Extracting codebase context...").start();

        try {
          const result = await generatorModule.generate({
            rootDir,
            packages: options.package ? [options.package] : undefined,
            types: options.type ? [options.type] : undefined,
            page: options.page,
            dryRun: options.dryRun,
            force: options.force,
            model: options.model,
            onProgress: (event: ProgressEvent) => {
              switch (event.phase) {
                case "extracting":
                  spinner.text = event.message;
                  break;
                case "generating":
                  spinner.text = `Generating [${event.current}/${event.total}] ${event.message}`;
                  break;
                case "validating":
                  spinner.text = `Validating [${event.current}/${event.total}] ${event.message}`;
                  break;
                case "writing":
                  spinner.text = `Writing [${event.current}/${event.total}] ${event.message}`;
                  break;
              }
            },
          });

          if (result.pagesGenerated.length > 0) {
            spinner.succeed(
              `Generated ${result.pagesGenerated.length} page(s) in ${(result.durationMs / 1000).toFixed(1)}s`,
            );

            if (options.dryRun) {
              console.log(chalk.dim("\n  Dry run — no files written. Pages that would be generated:\n"));
            } else {
              console.log(chalk.dim("\n  Generated pages:\n"));
            }

            for (const page of result.pagesGenerated) {
              console.log(`    ${chalk.green("+")} ${page}`);
            }
          } else {
            spinner.warn("No pages generated.");
          }

          if (result.pagesSkipped.length > 0) {
            console.log(chalk.dim(`\n  Skipped ${result.pagesSkipped.length} existing page(s). Use --force to overwrite.\n`));
          }

          if (result.pagesFailed.length > 0) {
            console.log(chalk.red(`\n  Failed (${result.pagesFailed.length}):\n`));
            for (const page of result.pagesFailed) {
              console.log(`    ${chalk.red("x")} ${page}`);
            }
          }

          if (result.warnings.length > 0) {
            console.log(chalk.yellow(`\n  Warnings (${result.warnings.length}):\n`));
            for (const warning of result.warnings.slice(0, 10)) {
              console.log(`    ${chalk.yellow("!")} ${warning}`);
            }
            if (result.warnings.length > 10) {
              console.log(chalk.dim(`    ... and ${result.warnings.length - 10} more`));
            }
          }

          console.log("");
        } catch (error) {
          spinner.fail("Documentation generation failed.");
          console.error(error);
          process.exit(1);
        }
      },
    );

  return docs;
}
