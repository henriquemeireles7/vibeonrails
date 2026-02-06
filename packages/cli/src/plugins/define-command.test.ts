/**
 * defineCommand() — Tests
 *
 * Tests for custom CLI plugin helper:
 * - Command registration (args, options)
 * - Output formatting inheritance (VIBE_OUTPUT)
 * - Error catalog integration
 * - Auto-discovery from src/commands/
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  defineCommand,
  discoverCommands,
  type CommandDefinition,
  type CommandContext,
} from "./define-command.js";

// ---------------------------------------------------------------------------
// defineCommand()
// ---------------------------------------------------------------------------

describe("defineCommand", () => {
  it("should create a Commander command with correct name and description", () => {
    const cmd = defineCommand({
      name: "test-cmd",
      description: "A test command",
      action: async () => {},
    });

    expect(cmd.name()).toBe("test-cmd");
    expect(cmd.description()).toBe("A test command");
  });

  it("should register positional arguments", () => {
    const cmd = defineCommand({
      name: "greet",
      description: "Greet someone",
      args: [
        { name: "name", description: "Name to greet", required: true },
        { name: "suffix", description: "Optional suffix", required: false },
      ],
      action: async () => {},
    });

    // Commander stores args as registeredArguments
    const registeredArgs = cmd.registeredArguments;
    expect(registeredArgs).toHaveLength(2);
    expect(registeredArgs[0]!.name()).toBe("name");
    expect(registeredArgs[0]!.required).toBe(true);
    expect(registeredArgs[1]!.name()).toBe("suffix");
    expect(registeredArgs[1]!.required).toBe(false);
  });

  it("should register named options including auto --json", () => {
    const cmd = defineCommand({
      name: "deploy",
      description: "Deploy",
      options: [
        { flags: "--env <env>", description: "Target env" },
        { flags: "-v, --verbose", description: "Verbose output" },
      ],
      action: async () => {},
    });

    const options = cmd.options;
    const optionNames = options.map((o) => o.long ?? o.short);
    expect(optionNames).toContain("--json");
    expect(optionNames).toContain("--env");
    expect(optionNames).toContain("--verbose");
  });

  it("should pass args and options to action handler", async () => {
    let capturedCtx: CommandContext | undefined;

    const cmd = defineCommand({
      name: "test-action",
      description: "Test",
      args: [{ name: "target", description: "Target", required: true }],
      options: [{ flags: "--force", description: "Force" }],
      action: async (ctx) => {
        capturedCtx = ctx;
      },
    });

    // Simulate commander calling the action
    await cmd.parseAsync(["node", "vibe", "my-target", "--force"], {
      from: "user",
    });

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.args["target"]).toBe("my-target");
    expect(capturedCtx!.options["force"]).toBe(true);
    expect(capturedCtx!.formatter).toBeDefined();
    expect(capturedCtx!.formatter.success).toBeTypeOf("function");
    expect(capturedCtx!.formatter.error).toBeTypeOf("function");
    expect(capturedCtx!.formatter.info).toBeTypeOf("function");
    expect(capturedCtx!.formatter.table).toBeTypeOf("function");
  });

  it("should set VIBE_OUTPUT=json when --json flag is passed", async () => {
    const originalEnv = process.env.VIBE_OUTPUT;
    let envDuringAction: string | undefined;

    const cmd = defineCommand({
      name: "json-test",
      description: "Test JSON mode",
      action: async () => {
        envDuringAction = process.env.VIBE_OUTPUT;
      },
    });

    await cmd.parseAsync(["node", "vibe", "--json"], { from: "user" });

    expect(envDuringAction).toBe("json");

    // Restore
    if (originalEnv) {
      process.env.VIBE_OUTPUT = originalEnv;
    } else {
      delete process.env.VIBE_OUTPUT;
    }
  });

  it("should handle action errors gracefully", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const cmd = defineCommand({
      name: "fail-cmd",
      description: "Will fail",
      action: async () => {
        throw new Error("Something went wrong");
      },
    });

    await expect(
      cmd.parseAsync(["node", "vibe"], { from: "user" }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("should support default values for arguments", () => {
    const cmd = defineCommand({
      name: "with-defaults",
      description: "Test defaults",
      args: [
        {
          name: "target",
          description: "Target",
          required: false,
          defaultValue: "production",
        },
      ],
      action: async () => {},
    });

    const registeredArgs = cmd.registeredArguments;
    expect(registeredArgs[0]!.defaultValue).toBe("production");
  });

  it("should support default values for options", () => {
    const cmd = defineCommand({
      name: "with-opt-defaults",
      description: "Test option defaults",
      options: [
        {
          flags: "--port <port>",
          description: "Port number",
          defaultValue: "3000",
        },
      ],
      action: async () => {},
    });

    const portOpt = cmd.options.find((o) => o.long === "--port");
    expect(portOpt).toBeDefined();
    expect(portOpt!.defaultValue).toBe("3000");
  });
});

// ---------------------------------------------------------------------------
// discoverCommands()
// ---------------------------------------------------------------------------

describe("discoverCommands", () => {
  const testDir = join(tmpdir(), "vibe-discover-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should discover .ts files in src/commands/", () => {
    const commandsDir = join(testDir, "src", "commands");
    mkdirSync(commandsDir, { recursive: true });

    writeFileSync(join(commandsDir, "deploy-preview.ts"), "export default {};");
    writeFileSync(join(commandsDir, "audit.ts"), "export default {};");

    const discovered = discoverCommands(testDir);
    expect(discovered).toHaveLength(2);

    const names = discovered.map((d) => d.commandName).sort();
    expect(names).toEqual(["audit", "deploy-preview"]);
  });

  it("should discover .js files", () => {
    const commandsDir = join(testDir, "src", "commands");
    mkdirSync(commandsDir, { recursive: true });

    writeFileSync(join(commandsDir, "hello.js"), "module.exports = {};");

    const discovered = discoverCommands(testDir);
    expect(discovered).toHaveLength(1);
    expect(discovered[0]!.commandName).toBe("hello");
  });

  it("should skip test files", () => {
    const commandsDir = join(testDir, "src", "commands");
    mkdirSync(commandsDir, { recursive: true });

    writeFileSync(join(commandsDir, "deploy.ts"), "export default {};");
    writeFileSync(join(commandsDir, "deploy.test.ts"), "test code");
    writeFileSync(join(commandsDir, "deploy.test.js"), "test code");

    const discovered = discoverCommands(testDir);
    expect(discovered).toHaveLength(1);
    expect(discovered[0]!.commandName).toBe("deploy");
  });

  it("should skip directories", () => {
    const commandsDir = join(testDir, "src", "commands");
    mkdirSync(join(commandsDir, "utils"), { recursive: true });
    writeFileSync(join(commandsDir, "real-cmd.ts"), "export default {};");

    const discovered = discoverCommands(testDir);
    expect(discovered).toHaveLength(1);
    expect(discovered[0]!.commandName).toBe("real-cmd");
  });

  it("should return empty array when directory does not exist", () => {
    const discovered = discoverCommands(testDir);
    expect(discovered).toEqual([]);
  });

  it("should support custom commands directory", () => {
    const customDir = join(testDir, "cli", "cmds");
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(customDir, "custom.ts"), "export default {};");

    const discovered = discoverCommands(testDir, "cli/cmds");
    expect(discovered).toHaveLength(1);
    expect(discovered[0]!.commandName).toBe("custom");
  });

  it("should include correct file paths", () => {
    const commandsDir = join(testDir, "src", "commands");
    mkdirSync(commandsDir, { recursive: true });
    writeFileSync(join(commandsDir, "my-cmd.ts"), "export default {};");

    const discovered = discoverCommands(testDir);
    expect(discovered[0]!.filePath).toBe(join("src", "commands", "my-cmd.ts"));
  });

  it("should skip non-ts/js files", () => {
    const commandsDir = join(testDir, "src", "commands");
    mkdirSync(commandsDir, { recursive: true });

    writeFileSync(join(commandsDir, "deploy.ts"), "export default {};");
    writeFileSync(join(commandsDir, "notes.md"), "some notes");
    writeFileSync(join(commandsDir, ".gitkeep"), "");

    const discovered = discoverCommands(testDir);
    expect(discovered).toHaveLength(1);
  });
});
