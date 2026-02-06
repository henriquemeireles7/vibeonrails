/**
 * @vibeonrails/support-feedback
 *
 * AI feedback classification and task generation pipeline.
 * Classifies feedback into bug/feature/question/complaint,
 * generates task files, and provides CLI commands.
 */

// Types
export type {
  FeedbackInput,
  FeedbackSource,
  ClassificationCategory,
  ClassificationResult,
  ClassifierOptions,
  GeneratorOptions,
  GeneratorOutput,
  JsonlEntry,
  FeedbackSummary,
  FeedbackExportOptions,
} from "./types.js";

export {
  FeedbackInputSchema,
  FeedbackSourceSchema,
  ClassificationCategorySchema,
  ClassificationResultSchema,
  GeneratorOutputSchema,
  JsonlEntrySchema,
  FEEDBACK_SOURCES,
  CLASSIFICATION_CATEGORIES,
} from "./types.js";

// Classifier
export { classifyFeedback, generateSlug } from "./classifier.js";

// Generator
export { generateTaskFile } from "./generator.js";

// CLI
export { feedbackSummary, feedbackExport, parseDuration } from "./cli.js";
export type { SummaryOptions } from "./cli.js";
