/**
 * Transform — Engine
 *
 * AI-powered content transformation engine.
 * Reads selected heuristics + channel prompt, calls AI provider,
 * generates channel-specific content with frontmatter.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { parseFrontmatter } from "../heuristics/loader.js";
import type { LoadedHeuristic } from "../heuristics/types.js";
import {
  PromptFrontmatterSchema,
  type ChannelPrompt,
  type TransformInput,
  type TransformOutput,
  type SupportedChannel,
  type ChannelConstraints,
} from "./types.js";

// ---------------------------------------------------------------------------
// Prompt Loader
// ---------------------------------------------------------------------------

/**
 * Load and parse a channel prompt file.
 */
export async function loadChannelPrompt(
  promptPath: string,
): Promise<ChannelPrompt> {
  const content = await readFile(promptPath, "utf-8");
  const { data, body } = parseFrontmatter(content);

  const frontmatter = PromptFrontmatterSchema.parse(data);

  const constraints: ChannelConstraints = {
    maxCharacters: frontmatter.maxCharacters,
    maxItems: frontmatter.maxItems,
    hashtags: frontmatter.hashtags,
    includeLinks: frontmatter.includeLinks,
    format: frontmatter.format,
  };

  return {
    channel: frontmatter.channel,
    systemPrompt: body.trim(),
    constraints,
    rawContent: content,
  };
}

// ---------------------------------------------------------------------------
// Prompt Assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the user prompt from selected heuristics and topic.
 */
export function assemblePrompt(
  heuristics: Partial<Record<string, LoadedHeuristic>>,
  topic?: string,
): string {
  const sections: string[] = [];

  for (const [type, heuristic] of Object.entries(heuristics)) {
    if (!heuristic) continue;

    sections.push(
      `## ${type.toUpperCase()} HEURISTIC: ${heuristic.frontmatter.title}`,
    );
    sections.push("");

    // Include key frontmatter fields
    const fm = heuristic.frontmatter;
    const fmEntries = Object.entries(fm).filter(
      ([key]) =>
        ![
          "id",
          "title",
          "type",
          "tags",
          "active",
          "createdAt",
          "updatedAt",
        ].includes(key),
    );

    for (const [key, value] of fmEntries) {
      if (Array.isArray(value) && value.length > 0) {
        sections.push(`**${key}**: ${value.join(", ")}`);
      } else if (typeof value === "string" && value) {
        sections.push(`**${key}**: ${value}`);
      }
    }

    if (heuristic.body) {
      sections.push("");
      sections.push(heuristic.body);
    }

    sections.push("");
    sections.push("---");
    sections.push("");
  }

  if (topic) {
    sections.push(`## TOPIC`);
    sections.push("");
    sections.push(topic);
    sections.push("");
  }

  sections.push(
    "Generate the content based on the heuristics and guidelines above.",
  );

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Transform Engine
// ---------------------------------------------------------------------------

/**
 * Transform heuristics + channel prompt into channel-specific content.
 */
export async function transformContent(
  input: TransformInput,
): Promise<TransformOutput> {
  // Load the channel prompt
  const prompt = await loadChannelPrompt(input.promptPath);

  // Assemble user prompt from heuristics
  const userPrompt = assemblePrompt(input.heuristics, input.topic);

  // Build system prompt with constraints
  const systemPrompt = buildSystemPrompt(prompt);

  // Call AI provider
  const generatedContent = await input.generate(userPrompt, systemPrompt);

  // Build heuristic hash map
  const heuristicHashes: Record<string, string> = {};
  for (const [type, heuristic] of Object.entries(input.heuristics)) {
    if (heuristic?.gitHash) {
      heuristicHashes[type] = heuristic.gitHash;
    }
  }

  return {
    content: generatedContent,
    channel: input.channel,
    metadata: {
      generatedAt: new Date().toISOString(),
      channel: input.channel,
      heuristicHashes,
      topic: input.topic,
      status: "draft",
    },
  };
}

/**
 * Build a complete system prompt from channel prompt and constraints.
 */
function buildSystemPrompt(prompt: ChannelPrompt): string {
  const parts: string[] = [prompt.systemPrompt];

  parts.push("");
  parts.push("## CONSTRAINTS");

  if (prompt.constraints.maxCharacters) {
    parts.push(`- Maximum ${prompt.constraints.maxCharacters} characters`);
  }
  if (prompt.constraints.maxItems) {
    parts.push(`- Maximum ${prompt.constraints.maxItems} items`);
  }
  if (prompt.constraints.hashtags) {
    parts.push("- Include relevant hashtags");
  } else {
    parts.push("- Do NOT include hashtags");
  }
  if (!prompt.constraints.includeLinks) {
    parts.push("- Do NOT include links");
  }

  const formatMap: Record<string, string> = {
    single: "Output a single post",
    thread: "Output a thread (multiple connected posts, separated by ---)",
    article:
      "Output a complete article with title, introduction, body, and conclusion",
    "email-body":
      "Output an email body with greeting, main content, and sign-off",
  };

  parts.push(
    `- Format: ${formatMap[prompt.constraints.format] ?? "single post"}`,
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Draft Writer
// ---------------------------------------------------------------------------

/**
 * Write generated content as a draft markdown file.
 */
export async function writeDraft(
  output: TransformOutput,
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  // Generate filename from timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${output.channel}-${timestamp}.md`;
  const filePath = join(outputDir, filename);

  // Build frontmatter
  const frontmatterLines = [
    "---",
    `generatedAt: "${output.metadata.generatedAt}"`,
    `channel: "${output.metadata.channel}"`,
    `status: "${output.metadata.status}"`,
  ];

  if (output.metadata.topic) {
    frontmatterLines.push(`topic: "${output.metadata.topic}"`);
  }

  if (Object.keys(output.metadata.heuristicHashes).length > 0) {
    frontmatterLines.push("heuristicHashes:");
    for (const [key, hash] of Object.entries(output.metadata.heuristicHashes)) {
      frontmatterLines.push(`  ${key}: "${hash}"`);
    }
  }

  frontmatterLines.push("---");
  frontmatterLines.push("");

  const fileContent = frontmatterLines.join("\n") + output.content;

  await writeFile(filePath, fileContent, "utf-8");

  return filePath;
}

// ---------------------------------------------------------------------------
// Generate and Write (convenience)
// ---------------------------------------------------------------------------

/**
 * Full pipeline: load prompt, transform, write draft.
 */
export async function generateAndWriteDraft(
  input: TransformInput,
  outputDir: string,
): Promise<{ output: TransformOutput; filePath: string }> {
  const output = await transformContent(input);
  const filePath = await writeDraft(output, outputDir);
  return { output, filePath };
}
