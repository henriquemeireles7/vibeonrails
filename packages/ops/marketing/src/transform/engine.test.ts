/**
 * Transform — Engine Tests
 *
 * Tests prompt assembly, AI fixture responses, output format validation,
 * and frontmatter generation with git hashes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadChannelPrompt,
  assemblePrompt,
  transformContent,
  writeDraft,
  generateAndWriteDraft,
} from "./engine.js";
import type { LoadedHeuristic } from "../heuristics/types.js";
import type { TransformInput, TransformOutput } from "./types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TWITTER_PROMPT = `---
channel: twitter
version: "1.0"
maxCharacters: 280
hashtags: false
includeLinks: true
format: single
---

You are a social media content creator for a tech startup.
Write engaging tweets that are concise and attention-grabbing.
Use the provided heuristics to craft the message.
Do not exceed character limits.
`;

const BLOG_PROMPT = `---
channel: blog
version: "1.0"
format: article
includeLinks: true
---

You are a technical blog writer.
Write clear, educational content based on the provided heuristics.
`;

function createMockHeuristic(
  type: string,
  id: string,
  title: string,
  body: string,
  extraFm: Record<string, unknown> = {},
): LoadedHeuristic {
  return {
    frontmatter: {
      id,
      title,
      type: type as "hook",
      tags: [],
      active: true,
      ...extraFm,
    } as LoadedHeuristic["frontmatter"],
    body,
    filePath: `${type}s/${id}.md`,
    absolutePath: `/content/marketing/heuristics/${type}s/${id}.md`,
    gitHash: `abc${id.slice(0, 4)}`,
  };
}

const mockGenerate =
  vi.fn<(prompt: string, systemPrompt: string) => Promise<string>>();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("loadChannelPrompt", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "prompts-"));
    await writeFile(join(tempDir, "twitter.md"), TWITTER_PROMPT);
    await writeFile(join(tempDir, "blog.md"), BLOG_PROMPT);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should load and parse a channel prompt", async () => {
    const prompt = await loadChannelPrompt(join(tempDir, "twitter.md"));
    expect(prompt.channel).toBe("twitter");
    expect(prompt.constraints.maxCharacters).toBe(280);
    expect(prompt.constraints.hashtags).toBe(false);
    expect(prompt.constraints.format).toBe("single");
    expect(prompt.systemPrompt).toContain("social media content creator");
  });

  it("should parse blog prompt with article format", async () => {
    const prompt = await loadChannelPrompt(join(tempDir, "blog.md"));
    expect(prompt.channel).toBe("blog");
    expect(prompt.constraints.format).toBe("article");
    expect(prompt.constraints.maxCharacters).toBeUndefined();
  });
});

describe("assemblePrompt", () => {
  it("should assemble prompt from multiple heuristics", () => {
    const heuristics: Partial<Record<string, LoadedHeuristic>> = {
      hook: createMockHeuristic(
        "hook",
        "test-hook",
        "Test Hook",
        "Why settle for less?",
        { format: "question" },
      ),
      client: createMockHeuristic(
        "client",
        "indie",
        "Indie Dev",
        "Builds alone",
        {
          segment: "solo founders",
          desires: ["speed"],
          problems: ["boilerplate"],
        },
      ),
    };

    const result = assemblePrompt(heuristics, "dark mode feature");

    expect(result).toContain("HOOK HEURISTIC: Test Hook");
    expect(result).toContain("CLIENT HEURISTIC: Indie Dev");
    expect(result).toContain("Why settle for less?");
    expect(result).toContain("TOPIC");
    expect(result).toContain("dark mode feature");
    expect(result).toContain("Generate the content");
  });

  it("should handle empty heuristics", () => {
    const result = assemblePrompt({});
    expect(result).toContain("Generate the content");
  });

  it("should handle no topic", () => {
    const heuristics: Partial<Record<string, LoadedHeuristic>> = {
      hook: createMockHeuristic("hook", "test", "Test", "Content"),
    };

    const result = assemblePrompt(heuristics);
    expect(result).not.toContain("TOPIC");
  });
});

describe("transformContent", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "transform-"));
    await writeFile(join(tempDir, "twitter.md"), TWITTER_PROMPT);
    mockGenerate.mockReset();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should generate content from heuristics and prompt", async () => {
    mockGenerate.mockResolvedValue("Check out our new dark mode feature!");

    const input: TransformInput = {
      channel: "twitter",
      heuristics: {
        hook: createMockHeuristic("hook", "test", "Test Hook", "Attention!"),
      },
      promptPath: join(tempDir, "twitter.md"),
      topic: "dark mode",
      generate: mockGenerate,
    };

    const result = await transformContent(input);

    expect(result.content).toBe("Check out our new dark mode feature!");
    expect(result.channel).toBe("twitter");
    expect(result.metadata.status).toBe("draft");
    expect(result.metadata.channel).toBe("twitter");
    expect(result.metadata.topic).toBe("dark mode");
    expect(result.metadata.generatedAt).toBeDefined();
  });

  it("should track heuristic git hashes in metadata", async () => {
    mockGenerate.mockResolvedValue("Generated content");

    const input: TransformInput = {
      channel: "twitter",
      heuristics: {
        hook: createMockHeuristic("hook", "test", "Test", "Body"),
        client: createMockHeuristic("client", "indie", "Indie", "Body"),
      },
      promptPath: join(tempDir, "twitter.md"),
      generate: mockGenerate,
    };

    const result = await transformContent(input);

    expect(result.metadata.heuristicHashes.hook).toBe("abctest");
    expect(result.metadata.heuristicHashes.client).toBe("abcindi");
  });

  it("should call generate with assembled prompt and system prompt", async () => {
    mockGenerate.mockResolvedValue("Output");

    const input: TransformInput = {
      channel: "twitter",
      heuristics: {
        hook: createMockHeuristic("hook", "test", "Test Hook", "Attention!"),
      },
      promptPath: join(tempDir, "twitter.md"),
      topic: "new feature",
      generate: mockGenerate,
    };

    await transformContent(input);

    expect(mockGenerate).toHaveBeenCalledOnce();
    const [userPrompt, systemPrompt] = mockGenerate.mock.calls[0]!;

    // User prompt should contain heuristic content
    expect(userPrompt).toContain("HOOK HEURISTIC: Test Hook");
    expect(userPrompt).toContain("new feature");

    // System prompt should contain constraints
    expect(systemPrompt).toContain("social media content creator");
    expect(systemPrompt).toContain("280 characters");
    expect(systemPrompt).toContain("Do NOT include hashtags");
  });
});

describe("writeDraft", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "drafts-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should write draft with correct frontmatter", async () => {
    const output: TransformOutput = {
      content: "Check out our new feature!",
      channel: "twitter",
      metadata: {
        generatedAt: "2026-01-15T10:00:00.000Z",
        channel: "twitter",
        heuristicHashes: { hook: "abc1234" },
        topic: "dark mode",
        status: "draft",
      },
    };

    const filePath = await writeDraft(output, tempDir);

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain('generatedAt: "2026-01-15T10:00:00.000Z"');
    expect(content).toContain('channel: "twitter"');
    expect(content).toContain('status: "draft"');
    expect(content).toContain('topic: "dark mode"');
    expect(content).toContain('hook: "abc1234"');
    expect(content).toContain("Check out our new feature!");
  });

  it("should create output directory if needed", async () => {
    const output: TransformOutput = {
      content: "Test content",
      channel: "bluesky",
      metadata: {
        generatedAt: new Date().toISOString(),
        channel: "bluesky",
        heuristicHashes: {},
        status: "draft",
      },
    };

    const nestedDir = join(tempDir, "nested", "dir");
    const filePath = await writeDraft(output, nestedDir);

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("Test content");
  });
});

describe("generateAndWriteDraft", () => {
  let tempDir: string;
  let promptDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gen-draft-"));
    promptDir = await mkdtemp(join(tmpdir(), "gen-prompt-"));
    await writeFile(join(promptDir, "twitter.md"), TWITTER_PROMPT);
    mockGenerate.mockReset();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    await rm(promptDir, { recursive: true, force: true });
  });

  it("should generate and write draft in one step", async () => {
    mockGenerate.mockResolvedValue("Full pipeline output!");

    const input: TransformInput = {
      channel: "twitter",
      heuristics: {
        hook: createMockHeuristic("hook", "test", "Test", "Body"),
      },
      promptPath: join(promptDir, "twitter.md"),
      topic: "AI features",
      generate: mockGenerate,
    };

    const { output, filePath } = await generateAndWriteDraft(input, tempDir);

    expect(output.content).toBe("Full pipeline output!");
    expect(output.metadata.status).toBe("draft");

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("Full pipeline output!");
    expect(content).toContain('channel: "twitter"');
  });
});
