/**
 * Transform — Types
 *
 * Defines channel prompt format, transform input/output,
 * and generation configuration for AI-powered content creation.
 */

import { z } from "zod";
import type {
  HeuristicFrontmatter,
  LoadedHeuristic,
} from "../heuristics/types.js";

// ---------------------------------------------------------------------------
// Supported Channels
// ---------------------------------------------------------------------------

export const SUPPORTED_CHANNELS = [
  "twitter",
  "bluesky",
  "blog",
  "email",
] as const;

export type SupportedChannel = (typeof SUPPORTED_CHANNELS)[number];

export const SupportedChannelSchema = z.enum(SUPPORTED_CHANNELS);

// ---------------------------------------------------------------------------
// Channel Prompt
// ---------------------------------------------------------------------------

export interface ChannelPrompt {
  /** Channel name */
  channel: SupportedChannel;

  /** System prompt for the AI */
  systemPrompt: string;

  /** Format constraints (character limits, etc.) */
  constraints: ChannelConstraints;

  /** Raw markdown content of the prompt file */
  rawContent: string;
}

export const ChannelConstraintsSchema = z.object({
  /** Maximum character count for the output */
  maxCharacters: z.number().int().positive().optional(),

  /** Maximum number of items (e.g., tweets in a thread) */
  maxItems: z.number().int().positive().optional(),

  /** Whether to include hashtags */
  hashtags: z.boolean().default(false),

  /** Whether to include links */
  includeLinks: z.boolean().default(true),

  /** Output format hint */
  format: z
    .enum(["single", "thread", "article", "email-body"])
    .default("single"),
});

export type ChannelConstraints = z.infer<typeof ChannelConstraintsSchema>;

// ---------------------------------------------------------------------------
// Transform Input
// ---------------------------------------------------------------------------

export interface TransformInput {
  /** Target channel */
  channel: SupportedChannel;

  /** Selected heuristics to use */
  heuristics: Partial<Record<HeuristicFrontmatter["type"], LoadedHeuristic>>;

  /** Path to channel prompt file */
  promptPath: string;

  /** Additional topic or context (free text) */
  topic?: string;

  /** AI generation function (from @vibeonrails/ai) */
  generate: GenerateFunction;
}

// ---------------------------------------------------------------------------
// Generate Function Interface
// ---------------------------------------------------------------------------

export type GenerateFunction = (
  prompt: string,
  systemPrompt: string,
) => Promise<string>;

// ---------------------------------------------------------------------------
// Transform Output
// ---------------------------------------------------------------------------

export const TransformOutputSchema = z.object({
  /** Generated content body */
  content: z.string().min(1),

  /** Channel this was generated for */
  channel: SupportedChannelSchema,

  /** Frontmatter for the generated draft file */
  metadata: z.object({
    /** Generation timestamp */
    generatedAt: z.string(),

    /** Channel name */
    channel: SupportedChannelSchema,

    /** Git hashes of heuristics used */
    heuristicHashes: z.record(z.string(), z.string()),

    /** Topic used for generation */
    topic: z.string().optional(),

    /** Status */
    status: z.literal("draft"),
  }),
});

export type TransformOutput = z.infer<typeof TransformOutputSchema>;

// ---------------------------------------------------------------------------
// Generation Config
// ---------------------------------------------------------------------------

export const GenerationConfigSchema = z.object({
  /** Target channel */
  channel: SupportedChannelSchema,

  /** Path to heuristics content directory */
  heuristicsDir: z.string(),

  /** Path to channel prompt file */
  promptPath: z.string(),

  /** Heuristic selection by type -> ID */
  heuristicSelection: z.record(z.string(), z.string()).default({}),

  /** Additional topic context */
  topic: z.string().optional(),

  /** Output directory for drafts */
  outputDir: z.string(),
});

export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

// ---------------------------------------------------------------------------
// Prompt Frontmatter Schema
// ---------------------------------------------------------------------------

export const PromptFrontmatterSchema = z.object({
  /** Channel this prompt is for */
  channel: SupportedChannelSchema,

  /** Version of the prompt */
  version: z.string().default("1.0"),

  /** Maximum characters for channel output */
  maxCharacters: z.number().int().positive().optional(),

  /** Maximum items (e.g., tweets in a thread) */
  maxItems: z.number().int().positive().optional(),

  /** Whether output should include hashtags */
  hashtags: z.boolean().default(false),

  /** Whether output should include links */
  includeLinks: z.boolean().default(true),

  /** Output format */
  format: z
    .enum(["single", "thread", "article", "email-body"])
    .default("single"),
});

export type PromptFrontmatter = z.infer<typeof PromptFrontmatterSchema>;
