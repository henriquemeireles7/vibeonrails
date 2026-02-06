/**
 * Transform — Barrel Export
 *
 * AI-powered content transformation from heuristics to channel content.
 */

// Types
export type {
  SupportedChannel,
  ChannelPrompt,
  ChannelConstraints,
  TransformInput,
  TransformOutput,
  GenerateFunction,
  GenerationConfig,
  PromptFrontmatter,
} from "./types.js";

export {
  SUPPORTED_CHANNELS,
  SupportedChannelSchema,
  ChannelConstraintsSchema,
  TransformOutputSchema,
  GenerationConfigSchema,
  PromptFrontmatterSchema,
} from "./types.js";

// Engine
export {
  loadChannelPrompt,
  assemblePrompt,
  transformContent,
  writeDraft,
  generateAndWriteDraft,
} from "./engine.js";

// CLI
export {
  executeGenerate,
  resolveContentPaths,
  formatGenerateResult,
} from "./cli.js";
export type { GenerateOptions, GenerateResult } from "./cli.js";
