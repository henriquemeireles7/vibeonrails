/**
 * `vibe modules list` — Show available modules, install status, descriptions.
 */

import { Command } from "commander";
import chalk from "chalk";
import { MODULE_REGISTRY } from "../modules/registry.js";
import { loadManifest } from "./add.js";

/**
 * Format module list for display.
 */
export function formatModuleList(projectRoot: string): string {
  const manifest = loadManifest(projectRoot);
  const lines: string[] = [];

  lines.push("");
  lines.push("  Available modules:");
  lines.push("");

  // Group by category
  const categories = ["ops", "features", "sites", "infra"] as const;
  const categoryLabels: Record<string, string> = {
    ops: "Business Operations",
    features: "Features",
    sites: "Sites",
    infra: "Infrastructure",
  };

  for (const category of categories) {
    const modules = MODULE_REGISTRY.filter((m) => m.category === category);
    if (modules.length === 0) continue;

    lines.push(`  ${chalk.bold(categoryLabels[category])}:`);
    lines.push("");

    for (const mod of modules) {
      const installed = manifest.modules[mod.name] !== undefined;
      const status = installed
        ? chalk.green("[installed]")
        : chalk.dim("[available]");
      const name = chalk.cyan(mod.name.padEnd(20));
      lines.push(`    ${status} ${name} ${mod.description}`);
    }

    lines.push("");
  }

  lines.push(`  Install: ${chalk.cyan("npx vibe add <module>")}`);
  lines.push(`  Remove:  ${chalk.cyan("npx vibe remove <module>")}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * `vibe modules` command with `list` subcommand.
 */
export function modulesCommand(): Command {
  const cmd = new Command("modules").description("Module management");

  cmd
    .command("list")
    .description("List all available modules and their install status")
    .action(() => {
      const output = formatModuleList(process.cwd());
      console.log(output);
    });

  return cmd;
}
