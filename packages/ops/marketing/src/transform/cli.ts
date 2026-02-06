/**
 * Transform — CLI Commands
 *
 * Implements `npx vibe marketing generate <channel>` with heuristic selection flags.
 */

import { join } from "node:path";
import { loadHeuristicById } from "../heuristics/loader.js";
import { generateAndWriteDraft } from "./engine.js";
import type { LoadedHeuristic, HeuristicType } from "../heuristics/types.js";
import type {
  SupportedChannel,
  TransformInput,
  GenerateFunction,
} from "./types.js";
import { SUPPORTED_CHANNELS } from "./types.js";

// ---------------------------------------------------------------------------
// Generate Options
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  /** Target channel */
  channel: SupportedChannel;

  /** Heuristic selections by type -> ID */
  selections: Partial<Record<HeuristicType, string>>;

  /** Additional topic or context */
  topic?: string;

  /** Path to heuristics directory */
  heuristicsDir: string;

  /** Path to channel prompt file */
  promptPath: string;

  /** Output directory for drafts */
  outputDir: string;

  /** AI generate function */
  generate: GenerateFunction;
}

export interface GenerateResult {
  /** Path to the written draft file */
  filePath: string;

  /** Generated content */
  content: string;

  /** Channel the content was generated for */
  channel: SupportedChannel;

  /** Number of heuristics used */
  heuristicsUsed: number;
}

// ---------------------------------------------------------------------------
// Generate Command
// ---------------------------------------------------------------------------

/**
 * Execute the generate command: load heuristics, transform, write draft.
 */
export async function executeGenerate(
  options: GenerateOptions,
): Promise<GenerateResult> {
  const {
    channel,
    selections,
    topic,
    heuristicsDir,
    promptPath,
    outputDir,
    generate,
  } = options;

  // Validate channel
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    throw new Error(
      `Invalid channel: "${channel}". Valid channels: ${SUPPORTED_CHANNELS.join(", ")}`,
    );
  }

  // Load selected heuristics
  const heuristics: Partial<Record<string, LoadedHeuristic>> = {};
  let heuristicsUsed = 0;

  for (const [type, id] of Object.entries(selections)) {
    if (!id) continue;

    const heuristic = await loadHeuristicById(
      heuristicsDir,
      id,
      type as HeuristicType,
    );

    if (!heuristic) {
      throw new Error(
        `Heuristic not found: type="${type}", id="${id}". ` +
          `Check that the file exists in ${heuristicsDir}/${type}s/${id}.md`,
      );
    }

    heuristics[type] = heuristic;
    heuristicsUsed++;
  }

  // Build transform input
  const input: TransformInput = {
    channel,
    heuristics,
    promptPath,
    topic,
    generate,
  };

  // Generate and write draft
  const { output, filePath } = await generateAndWriteDraft(input, outputDir);

  return {
    filePath,
    content: output.content,
    channel: output.channel,
    heuristicsUsed,
  };
}

// ---------------------------------------------------------------------------
// Resolve Paths
// ---------------------------------------------------------------------------

/**
 * Resolve standard content paths from a project root.
 */
export function resolveContentPaths(
  projectRoot: string,
  channel: SupportedChannel,
): {
  heuristicsDir: string;
  promptPath: string;
  outputDir: string;
} {
  return {
    heuristicsDir: join(projectRoot, "content", "marketing", "heuristics"),
    promptPath: join(
      projectRoot,
      "content",
      "marketing",
      "transform",
      "prompts",
      `${channel}.md`,
    ),
    outputDir: join(
      projectRoot,
      "content",
      "marketing",
      "channels",
      channel,
      "drafts",
    ),
  };
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

/**
 * Format generate result for CLI output.
 */
export function formatGenerateResult(result: GenerateResult): string {
  const lines: string[] = [
    "",
    `  Channel: ${result.channel}`,
    `  Heuristics used: ${result.heuristicsUsed}`,
    `  Draft saved to: ${result.filePath}`,
    "",
    "  Preview:",
    `  ${result.content.slice(0, 200)}${result.content.length > 200 ? "..." : ""}`,
    "",
  ];

  return lines.join("\n");
}
