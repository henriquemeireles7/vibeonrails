/**
 * Support Feedback — Types
 *
 * Defines FeedbackInput, Classification categories, and ClassificationResult
 * for the AI-powered feedback classification and task generation pipeline.
 *
 * Classification categories:
 * - bug: Creates .plan/tasks/backlog/bug-{slug}.md
 * - feature-aligned: Creates .plan/tasks/backlog/feat-{slug}.md
 * - feature-unaligned: Logs to content/feedback/requests.jsonl
 * - question: Answers from knowledge base automatically
 * - complaint: Escalates to human via notification
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Feedback Source
// ---------------------------------------------------------------------------

export const FEEDBACK_SOURCES = [
  "chat",
  "api",
  "email",
  "github",
  "manual",
] as const;

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

export const FeedbackSourceSchema = z.enum(FEEDBACK_SOURCES);

// ---------------------------------------------------------------------------
// Classification Categories
// ---------------------------------------------------------------------------

export const CLASSIFICATION_CATEGORIES = [
  "bug",
  "feature-aligned",
  "feature-unaligned",
  "question",
  "complaint",
] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

export const ClassificationCategorySchema = z.enum(CLASSIFICATION_CATEGORIES);

// ---------------------------------------------------------------------------
// Feedback Input
// ---------------------------------------------------------------------------

export const FeedbackInputSchema = z.object({
  /** Raw feedback content from user */
  content: z.string().min(1),

  /** Where the feedback came from */
  source: FeedbackSourceSchema,

  /** User ID if available */
  userId: z.string().nullable().default(null),

  /** User email if available */
  userEmail: z.string().email().nullable().default(null),

  /** Chat session ID if from support chat */
  sessionId: z.string().nullable().default(null),

  /** Additional context or metadata */
  metadata: z.record(z.string(), z.unknown()).default({}),

  /** Submission timestamp (ISO string) */
  submittedAt: z.string().optional(),
});

export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

// ---------------------------------------------------------------------------
// Classification Result
// ---------------------------------------------------------------------------

export const ClassificationResultSchema = z.object({
  /** The classification category */
  category: ClassificationCategorySchema,

  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),

  /** AI-generated title/summary for the feedback */
  title: z.string().min(1),

  /** AI-generated slug for file naming */
  slug: z.string().min(1),

  /** AI reasoning for the classification */
  reasoning: z.string(),

  /** Suggested priority for bugs and features */
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),

  /** Related roadmap item if feature-aligned */
  relatedRoadmapItem: z.string().optional(),

  /** Auto-generated answer if classification is 'question' */
  answer: z.string().optional(),

  /** Tags extracted from the feedback */
  tags: z.array(z.string()).default([]),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// ---------------------------------------------------------------------------
// Classifier Options
// ---------------------------------------------------------------------------

export interface ClassifierOptions {
  /** Raw feedback to classify */
  feedback: FeedbackInput;

  /** Project root directory (for reading .plan/ context) */
  projectRoot: string;

  /** AI generate function (from @vibeonrails/ai) */
  generate: (prompt: string, systemPrompt: string) => Promise<string>;

  /** Path to roadmap file (default: .plan/ROADMAP.md) */
  roadmapPath?: string;

  /** Path to context file (default: .plan/CONTEXT.md) */
  contextPath?: string;

  /** Path to existing tasks (default: .plan/tasks/) */
  tasksPath?: string;
}

// ---------------------------------------------------------------------------
// Task Generator Options
// ---------------------------------------------------------------------------

export interface GeneratorOptions {
  /** Classification result to generate from */
  classification: ClassificationResult;

  /** Original feedback input */
  feedback: FeedbackInput;

  /** Project root directory */
  projectRoot: string;

  /** Path to backlog directory (default: .plan/tasks/backlog/) */
  backlogPath?: string;

  /** Path to feedback JSONL (default: content/feedback/requests.jsonl) */
  jsonlPath?: string;
}

// ---------------------------------------------------------------------------
// Generator Output
// ---------------------------------------------------------------------------

export const GeneratorOutputSchema = z.object({
  /** Action taken */
  action: z.enum([
    "task_created",
    "jsonl_appended",
    "question_answered",
    "complaint_escalated",
  ]),

  /** Path to the created file (for task_created) */
  filePath: z.string().optional(),

  /** Auto-generated answer (for question_answered) */
  answer: z.string().optional(),

  /** Whether the feedback was a duplicate */
  isDuplicate: z.boolean().default(false),
});

export type GeneratorOutput = z.infer<typeof GeneratorOutputSchema>;

// ---------------------------------------------------------------------------
// JSONL Entry
// ---------------------------------------------------------------------------

export const JsonlEntrySchema = z.object({
  /** Timestamp of the entry */
  timestamp: z.string(),

  /** Original feedback content */
  content: z.string(),

  /** Feedback source */
  source: FeedbackSourceSchema,

  /** Classification result */
  category: ClassificationCategorySchema,

  /** User ID if available */
  userId: z.string().nullable(),

  /** Slug for reference */
  slug: z.string(),

  /** Tags */
  tags: z.array(z.string()),
});

export type JsonlEntry = z.infer<typeof JsonlEntrySchema>;

// ---------------------------------------------------------------------------
// CLI Types
// ---------------------------------------------------------------------------

export interface FeedbackSummary {
  /** Time period for the summary */
  period: string;

  /** Total feedback count */
  total: number;

  /** Breakdown by category */
  byCategory: Record<ClassificationCategory, number>;

  /** Breakdown by source */
  bySource: Record<FeedbackSource, number>;

  /** Top tags */
  topTags: Array<{ tag: string; count: number }>;

  /** Most common issues */
  topIssues: Array<{
    title: string;
    count: number;
    category: ClassificationCategory;
  }>;
}

export interface FeedbackExportOptions {
  /** Export format */
  format: "csv" | "json";

  /** Time filter (e.g., '7d', '30d') */
  since?: string;

  /** Category filter */
  category?: ClassificationCategory;

  /** Output file path */
  outputPath: string;
}
