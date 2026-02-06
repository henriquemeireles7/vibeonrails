import { Command } from "commander";
import { basename } from "node:path";
import {
  createCommand,
  generateCommand,
  devCommand,
  dbCommand,
  buildCommand,
  deployCommand,
} from "./commands/index.js";

const program = new Command();

program
  .name("aor")
  .description("Agent on Rails — The TypeScript Framework AI Agents Understand")
  .version("0.1.0");

// Register all commands
program.addCommand(createCommand());
program.addCommand(generateCommand());
program.addCommand(devCommand());
program.addCommand(dbCommand());
program.addCommand(buildCommand());
program.addCommand(deployCommand());

// If invoked as `create-aor`, auto-run the create command
const binName = basename(process.argv[1] ?? "");
if (binName === "create-aor" || binName === "create-aor.js") {
  // Rewrite argv so Commander sees: aor create <rest...>
  process.argv = [
    process.argv[0]!,
    "aor",
    "create",
    ...process.argv.slice(2),
  ];
}

program.parse();
