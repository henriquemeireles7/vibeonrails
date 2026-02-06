import { Command } from "commander";
import { basename } from "node:path";
import {
  createCommand,
  generateCommand,
  devCommand,
  dbCommand,
  buildCommand,
  deployCommand,
  docsCommand,
} from "./commands/index.js";

const program = new Command();

program
  .name("vibe")
  .description("Vibe on Rails — The TypeScript Framework for Vibe Coding")
  .version("0.1.0");

// Register all commands
program.addCommand(createCommand());
program.addCommand(generateCommand());
program.addCommand(devCommand());
program.addCommand(dbCommand());
program.addCommand(buildCommand());
program.addCommand(deployCommand());
program.addCommand(docsCommand());

// If invoked as `create-vibe`, auto-run the create command
const binName = basename(process.argv[1] ?? "");
if (binName === "create-vibe" || binName === "create-vibe.js") {
  // Rewrite argv so Commander sees: vibe create <rest...>
  process.argv = [
    process.argv[0]!,
    "vibe",
    "create",
    ...process.argv.slice(2),
  ];
}

program.parse();
