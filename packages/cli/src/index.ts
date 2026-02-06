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
  addCommand,
  removeCommand,
  modulesCommand,
  modulesPublishCommand,
  modulesListCommunityCommand,
  testRecordCommand,
  testCoverageCommand,
  contentCommand,
  configCommand,
  statusCommand,
  reportCommand,
  askCommand,
  fixCommand,
  generateAiCommand,
} from "./commands/index.js";
import { undoCommand } from "./undo/index.js";

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
program.addCommand(addCommand());
program.addCommand(removeCommand());
// Modules command with publish and community subcommands
const modules = modulesCommand();
modules.addCommand(modulesPublishCommand());
modules.addCommand(modulesListCommunityCommand());
program.addCommand(modules);

program.addCommand(connectCommand());
program.addCommand(connectionsCommand());
program.addCommand(disconnectCommand());

// Phase 8: Ecosystem & Testing DX
const testCmd = new Command("test")
  .description("Testing tools — fixture recording and coverage");
testCmd.addCommand(testRecordCommand());
testCmd.addCommand(testCoverageCommand());
program.addCommand(testCmd);

// Phase 10: Time Travel, Dashboards & AI Superpowers
program.addCommand(undoCommand());
program.addCommand(contentCommand());
program.addCommand(configCommand());
program.addCommand(statusCommand());
program.addCommand(reportCommand());
program.addCommand(askCommand());
program.addCommand(fixCommand());
program.addCommand(generateAiCommand());

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
