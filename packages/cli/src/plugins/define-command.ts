/**
 * defineCommand() — Custom CLI Plugin Helper
 *
 * Allows users to create custom CLI commands in src/commands/.
 * Auto-registered by vibe CLI. Gets output formatting (VIBE_OUTPUT),
 * error catalog, and --json flag for free.
 *
 * Usage:
 *   // src/commands/deploy-preview.ts
 *   import { defineCommand } from '@vibeonrails/cli';
 *
 *   export default defineCommand({
 *     name: 'deploy-preview',
 *     description: 'Deploy a preview environment',
 *     args: [{ name: 'branch', description: 'Git branch', required: false }],
 *     options: [{ flags: '--env <env>', description: 'Target environment' }],
 *     action: async ({ args, options, formatter }) => {
 *       const branch = args.branch ?? 'main';
 *       formatter.info(`Deploying ${branch}...`);
 *       formatter.success({
 *         command: 'deploy-preview',
 *         data: { branch, url: `https://preview-${branch}.example.com` },
 *         message: `Preview deployed for ${branch}`,
 *       });
 *     },
 *   });
 */

import { Command } from "commander";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  createFormatter,
  type OutputFormatter,
} from "../output/formatter.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Argument definition for a custom command.
 */
export interface CommandArgDef {
  /** Argument name (e.g., 'branch', 'module') */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Whether the argument is required (default: false) */
  readonly required?: boolean;
  /** Default value if not provided */
  readonly defaultValue?: string;
}

/**
 * Option definition for a custom command.
 */
export interface CommandOptionDef {
  /** Commander-style flag string (e.g., '--env <env>', '-v, --verbose') */
  readonly flags: string;
  /** Human-readable description */
  readonly description: string;
  /** Default value */
  readonly defaultValue?: string | boolean;
}

/**
 * Context passed to the action handler.
 */
export interface CommandContext {
  /** Parsed positional arguments (keyed by arg name) */
  readonly args: Record<string, string | undefined>;
  /** Parsed options (keyed by option long name) */
  readonly options: Record<string, string | boolean | undefined>;
  /** Output formatter (respects VIBE_OUTPUT) */
  readonly formatter: OutputFormatter;
}

/**
 * Custom command definition.
 */
export interface CommandDefinition {
  /** Command name (kebab-case, e.g., 'deploy-preview') */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Positional arguments */
  readonly args?: readonly CommandArgDef[];
  /** Named options */
  readonly options?: readonly CommandOptionDef[];
  /** Action handler */
  readonly action: (ctx: CommandContext) => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// defineCommand()
// ---------------------------------------------------------------------------

/**
 * Define a custom CLI command.
 *
 * Returns a Commander.Command instance with VIBE_OUTPUT support,
 * error handling, and --json flag automatically wired.
 */
export function defineCommand(definition: CommandDefinition): Command {
  const cmd = new Command(definition.name).description(
    definition.description,
  );

  // Register positional arguments
  const argNames: string[] = [];
  if (definition.args) {
    for (const arg of definition.args) {
      const bracket = arg.required
        ? `<${arg.name}>`
        : `[${arg.name}]`;
      if (arg.defaultValue !== undefined) {
        cmd.argument(bracket, arg.description, arg.defaultValue);
      } else {
        cmd.argument(bracket, arg.description);
      }
      argNames.push(arg.name);
    }
  }

  // Register named options (--json is added automatically)
  cmd.option("--json", "Output as JSON (same as VIBE_OUTPUT=json)");

  if (definition.options) {
    for (const opt of definition.options) {
      if (opt.defaultValue !== undefined) {
        cmd.option(opt.flags, opt.description, opt.defaultValue);
      } else {
        cmd.option(opt.flags, opt.description);
      }
    }
  }

  // Action handler with output formatting and error handling
  cmd.action(async (...rawArgs: unknown[]) => {
    // Commander passes positional args first, then the Command options object,
    // then the command instance itself.
    const opts = (rawArgs[argNames.length] ?? {}) as Record<
      string,
      string | boolean | undefined
    >;

    // If --json was passed, override VIBE_OUTPUT
    if (opts["json"] === true) {
      process.env.VIBE_OUTPUT = "json";
    }

    const formatter = createFormatter();

    // Build args record
    const args: Record<string, string | undefined> = {};
    for (let i = 0; i < argNames.length; i++) {
      args[argNames[i]!] = rawArgs[i] as string | undefined;
    }

    // Build options record (exclude 'json' internal flag)
    const options: Record<string, string | boolean | undefined> = {};
    for (const [key, value] of Object.entries(opts)) {
      if (key !== "json") {
        options[key] = value;
      }
    }

    const ctx: CommandContext = { args, options, formatter };

    try {
      await definition.action(ctx);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      formatter.error({
        command: definition.name,
        message,
        detail: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    }
  });

  return cmd;
}

// ---------------------------------------------------------------------------
// Auto-Discovery
// ---------------------------------------------------------------------------

/**
 * Result of discovering user-defined commands.
 */
export interface DiscoveredCommand {
  /** File path (relative to project root) */
  readonly filePath: string;
  /** Command name (derived from file name) */
  readonly commandName: string;
}

/**
 * Discover user-defined commands in a project directory.
 *
 * Scans src/commands/ for .ts/.js files that default-export a Command.
 * Returns metadata about discovered commands (does NOT import them).
 */
export function discoverCommands(
  projectRoot: string,
  commandsDir = "src/commands",
): readonly DiscoveredCommand[] {
  const dir = join(projectRoot, commandsDir);
  if (!existsSync(dir)) {
    return [];
  }

  const files = readdirSync(dir, { withFileTypes: true });
  const commands: DiscoveredCommand[] = [];

  for (const file of files) {
    if (!file.isFile()) continue;
    if (file.name.endsWith(".test.ts") || file.name.endsWith(".test.js")) continue;
    if (!file.name.endsWith(".ts") && !file.name.endsWith(".js")) continue;

    // Derive command name from file name (kebab-case without extension)
    const commandName = file.name.replace(/\.(ts|js)$/, "");

    commands.push({
      filePath: join(commandsDir, file.name),
      commandName,
    });
  }

  return commands;
}

/**
 * Load a user-defined command from a file path.
 *
 * Expects the file to default-export a Command (from defineCommand()).
 * Returns null if the file does not export a valid command.
 */
export async function loadCommand(
  projectRoot: string,
  filePath: string,
): Promise<Command | null> {
  const fullPath = join(projectRoot, filePath);

  try {
    const mod = await import(fullPath);
    const command = mod.default ?? mod;

    if (command instanceof Command) {
      return command;
    }

    return null;
  } catch {
    return null;
  }
}
