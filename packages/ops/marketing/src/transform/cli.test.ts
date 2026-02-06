/**
 * Transform — CLI Tests
 *
 * Tests generate command with flag combinations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  executeGenerate,
  resolveContentPaths,
  formatGenerateResult,
} from "./cli.js";
import type { SupportedChannel } from "./types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TWITTER_PROMPT = `---
channel: twitter
version: "1.0"
maxCharacters: 280
hashtags: false
format: single
---

Write a concise tweet based on the heuristics provided.
`;

const HOOK_FILE = `---
id: "test-hook"
title: "Test Hook"
type: hook
format: question
tags: []
active: true
---

Why are you still doing X the hard way?
`;

const CLIENT_FILE = `---
id: "indie-dev"
title: "Indie Dev"
type: client
segment: "Solo developers"
desires:
  - "Ship faster"
problems:
  - "Too many tools"
painBudget: high
tags: []
active: true
---

Solo developers building SaaS products.
`;

const mockGenerate =
  vi.fn<(prompt: string, systemPrompt: string) => Promise<string>>();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeGenerate", () => {
  let heuristicsDir: string;
  let promptDir: string;
  let outputDir: string;

  beforeEach(async () => {
    heuristicsDir = await mkdtemp(join(tmpdir(), "gen-heuristics-"));
    promptDir = await mkdtemp(join(tmpdir(), "gen-prompts-"));
    outputDir = await mkdtemp(join(tmpdir(), "gen-output-"));

    // Create heuristic files
    await mkdir(join(heuristicsDir, "hooks"), { recursive: true });
    await mkdir(join(heuristicsDir, "clients"), { recursive: true });
    await writeFile(join(heuristicsDir, "hooks", "test-hook.md"), HOOK_FILE);
    await writeFile(
      join(heuristicsDir, "clients", "indie-dev.md"),
      CLIENT_FILE,
    );

    // Create prompt file
    await writeFile(join(promptDir, "twitter.md"), TWITTER_PROMPT);

    mockGenerate.mockReset();
    mockGenerate.mockResolvedValue("Generated tweet about shipping faster!");
  });

  afterEach(async () => {
    await rm(heuristicsDir, { recursive: true, force: true });
    await rm(promptDir, { recursive: true, force: true });
    await rm(outputDir, { recursive: true, force: true });
  });

  it("should generate content with selected heuristics", async () => {
    const result = await executeGenerate({
      channel: "twitter",
      selections: { hook: "test-hook", client: "indie-dev" },
      heuristicsDir,
      promptPath: join(promptDir, "twitter.md"),
      outputDir,
      generate: mockGenerate,
    });

    expect(result.channel).toBe("twitter");
    expect(result.heuristicsUsed).toBe(2);
    expect(result.content).toBe("Generated tweet about shipping faster!");
    expect(result.filePath).toContain("twitter-");
  });

  it("should generate with topic", async () => {
    const result = await executeGenerate({
      channel: "twitter",
      selections: { hook: "test-hook" },
      topic: "dark mode feature",
      heuristicsDir,
      promptPath: join(promptDir, "twitter.md"),
      outputDir,
      generate: mockGenerate,
    });

    expect(result.heuristicsUsed).toBe(1);
    const [userPrompt] = mockGenerate.mock.calls[0]!;
    expect(userPrompt).toContain("dark mode feature");
  });

  it("should generate with no heuristics (topic only)", async () => {
    const result = await executeGenerate({
      channel: "twitter",
      selections: {},
      topic: "exciting announcement",
      heuristicsDir,
      promptPath: join(promptDir, "twitter.md"),
      outputDir,
      generate: mockGenerate,
    });

    expect(result.heuristicsUsed).toBe(0);
  });

  it("should throw for invalid channel", async () => {
    await expect(
      executeGenerate({
        channel: "instagram" as SupportedChannel,
        selections: {},
        heuristicsDir,
        promptPath: join(promptDir, "twitter.md"),
        outputDir,
        generate: mockGenerate,
      }),
    ).rejects.toThrow("Invalid channel");
  });

  it("should throw for non-existent heuristic", async () => {
    await expect(
      executeGenerate({
        channel: "twitter",
        selections: { hook: "nonexistent" },
        heuristicsDir,
        promptPath: join(promptDir, "twitter.md"),
        outputDir,
        generate: mockGenerate,
      }),
    ).rejects.toThrow("Heuristic not found");
  });

  it("should write draft to output directory", async () => {
    const result = await executeGenerate({
      channel: "twitter",
      selections: { hook: "test-hook" },
      heuristicsDir,
      promptPath: join(promptDir, "twitter.md"),
      outputDir,
      generate: mockGenerate,
    });

    const content = await readFile(result.filePath, "utf-8");
    expect(content).toContain('channel: "twitter"');
    expect(content).toContain('status: "draft"');
    expect(content).toContain("Generated tweet about shipping faster!");
  });
});

describe("resolveContentPaths", () => {
  it("should resolve standard content paths", () => {
    const paths = resolveContentPaths("/my/project", "twitter");

    expect(paths.heuristicsDir).toBe(
      "/my/project/content/marketing/heuristics",
    );
    expect(paths.promptPath).toBe(
      "/my/project/content/marketing/transform/prompts/twitter.md",
    );
    expect(paths.outputDir).toBe(
      "/my/project/content/marketing/channels/twitter/drafts",
    );
  });

  it("should resolve for different channels", () => {
    const paths = resolveContentPaths("/root", "bluesky");
    expect(paths.promptPath).toContain("bluesky.md");
    expect(paths.outputDir).toContain("bluesky");
  });
});

describe("formatGenerateResult", () => {
  it("should format result with preview", () => {
    const output = formatGenerateResult({
      filePath: "/content/marketing/channels/twitter/drafts/tweet.md",
      content: "Check out our new feature!",
      channel: "twitter",
      heuristicsUsed: 2,
    });

    expect(output).toContain("Channel: twitter");
    expect(output).toContain("Heuristics used: 2");
    expect(output).toContain("Check out our new feature!");
  });

  it("should truncate long content preview", () => {
    const longContent = "A".repeat(300);
    const output = formatGenerateResult({
      filePath: "/path/to/file.md",
      content: longContent,
      channel: "blog",
      heuristicsUsed: 1,
    });

    expect(output).toContain("...");
  });
});
