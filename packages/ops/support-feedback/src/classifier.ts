/**
 * Support Feedback — Classifier
 *
 * AI-powered feedback classification against project context.
 * Reads .plan/ROADMAP.md, .plan/CONTEXT.md, and existing tasks
 * to make informed classification decisions.
 *
 * Usage:
 *   import { classifyFeedback } from '@vibeonrails/support-feedback';
 *
 *   const result = await classifyFeedback({
 *     feedback: { content: 'Login crashes on Safari', source: 'chat' },
 *     projectRoot: '/path/to/project',
 *     generate: aiProvider.chat,
 *   });
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";
import {
  type ClassifierOptions,
  type ClassificationResult,
  ClassificationResultSchema,
} from "./types.js";

// ---------------------------------------------------------------------------
// Context Loading
// ---------------------------------------------------------------------------

/**
 * Read a file safely, returning empty string if not found.
 */
async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * List existing task filenames in the backlog.
 */
async function listExistingTasks(tasksPath: string): Promise<string[]> {
  try {
    const entries = await readdir(tasksPath, { recursive: true });
    return entries
      .filter((e) => typeof e === "string" && e.endsWith(".md"))
      .map((e) => String(e));
  } catch {
    return [];
  }
}

/**
 * Load project context for the classifier.
 */
async function loadProjectContext(
  projectRoot: string,
  roadmapPath?: string,
  contextPath?: string,
  tasksPath?: string,
): Promise<string> {
  const roadmap = await readFileSafe(
    roadmapPath ?? join(projectRoot, ".plan", "ROADMAP.md"),
  );

  const context = await readFileSafe(
    contextPath ?? join(projectRoot, ".plan", "CONTEXT.md"),
  );

  const existingTasks = await listExistingTasks(
    tasksPath ?? join(projectRoot, ".plan", "tasks"),
  );

  const parts: string[] = [];

  if (roadmap) {
    parts.push(`## Project Roadmap\n${roadmap}`);
  }

  if (context) {
    parts.push(`## Project Context\n${context}`);
  }

  if (existingTasks.length > 0) {
    parts.push(
      `## Existing Tasks\n${existingTasks.map((t) => `- ${t}`).join("\n")}`,
    );
  }

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Slug Generation
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic slug from a title string.
 * Same input always produces the same slug.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

const CLASSIFICATION_SYSTEM_PROMPT = `You are a feedback classifier for a software project. Classify user feedback into one of these categories:

- "bug": Something is broken or not working as expected
- "feature-aligned": A feature request that aligns with the project roadmap
- "feature-unaligned": A feature request that does NOT align with the roadmap
- "question": User asking a question that can be answered from docs/knowledge base
- "complaint": User expressing frustration without actionable feedback

You must respond with a valid JSON object with these fields:
- category: one of "bug", "feature-aligned", "feature-unaligned", "question", "complaint"
- confidence: number between 0 and 1
- title: a concise title summarizing the feedback (max 80 chars)
- slug: a URL-safe slug derived from the title (lowercase, hyphens, no special chars)
- reasoning: a brief explanation of why you chose this category
- priority: "low", "medium", "high", or "critical" (for bugs and features only)
- relatedRoadmapItem: which roadmap item this relates to (for feature-aligned only)
- answer: an answer to the question (for questions only)
- tags: array of relevant tags (max 5)

Respond ONLY with the JSON object, no markdown formatting.`;

/**
 * Classify feedback using AI against project context.
 */
export async function classifyFeedback(
  options: ClassifierOptions,
): Promise<ClassificationResult> {
  const {
    feedback,
    projectRoot,
    generate,
    roadmapPath,
    contextPath,
    tasksPath,
  } = options;

  // Load project context
  const projectContext = await loadProjectContext(
    projectRoot,
    roadmapPath,
    contextPath,
    tasksPath,
  );

  // Build the classification prompt
  const prompt = `${projectContext ? `# Project Context\n\n${projectContext}\n\n` : ""}# User Feedback

Source: ${feedback.source}
Content: ${feedback.content}
${feedback.metadata && Object.keys(feedback.metadata).length > 0 ? `Metadata: ${JSON.stringify(feedback.metadata)}` : ""}

Classify this feedback.`;

  // Get AI classification
  const rawResponse = await generate(prompt, CLASSIFICATION_SYSTEM_PROMPT);

  // Parse and validate the response
  try {
    const parsed: unknown = JSON.parse(rawResponse);
    return ClassificationResultSchema.parse(parsed);
  } catch {
    // Fallback classification if AI response is invalid
    return {
      category: "question",
      confidence: 0.3,
      title: feedback.content.slice(0, 80),
      slug: generateSlug(feedback.content.slice(0, 80)),
      reasoning: "AI classification failed, defaulting to question category",
      tags: [],
    };
  }
}
