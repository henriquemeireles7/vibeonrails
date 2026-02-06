/**
 * Support Feedback — Task Generator
 *
 * Creates task files for bugs and features, appends to JSONL for
 * unaligned requests, and handles question/complaint routing.
 *
 * Output paths:
 * - bug: .plan/tasks/backlog/bug-{slug}.md
 * - feature-aligned: .plan/tasks/backlog/feat-{slug}.md
 * - feature-unaligned: content/feedback/requests.jsonl
 * - question: Returns answer (no file created)
 * - complaint: Escalates (no file created)
 *
 * Usage:
 *   import { generateTaskFile } from '@vibeonrails/support-feedback';
 *
 *   const result = await generateTaskFile({
 *     classification: classResult,
 *     feedback: feedbackInput,
 *     projectRoot: '/path/to/project',
 *   });
 */

import { writeFile, appendFile, mkdir, readdir } from "fs/promises";
import { join, dirname } from "path";
import type { GeneratorOptions, GeneratorOutput, JsonlEntry } from "./types.js";

// ---------------------------------------------------------------------------
// Task File Templates
// ---------------------------------------------------------------------------

function buildBugTaskContent(
  title: string,
  content: string,
  source: string,
  priority: string,
  reasoning: string,
  tags: string[],
): string {
  return `---
title: "${title}"
type: bug
priority: ${priority}
status: backlog
source: ${source}
tags: [${tags.map((t) => `"${t}"`).join(", ")}]
createdAt: "${new Date().toISOString()}"
---

# ${title}

## Description

${content}

## Classification

${reasoning}

## Steps to Reproduce

<!-- Add reproduction steps here -->

## Expected Behavior

<!-- Describe expected behavior -->

## Actual Behavior

<!-- Describe actual behavior -->
`;
}

function buildFeatureTaskContent(
  title: string,
  content: string,
  source: string,
  priority: string,
  reasoning: string,
  relatedRoadmapItem: string | undefined,
  tags: string[],
): string {
  return `---
title: "${title}"
type: feature
priority: ${priority}
status: backlog
source: ${source}
${relatedRoadmapItem ? `relatedTo: "${relatedRoadmapItem}"` : ""}
tags: [${tags.map((t) => `"${t}"`).join(", ")}]
createdAt: "${new Date().toISOString()}"
---

# ${title}

## Description

${content}

## Classification

${reasoning}

${relatedRoadmapItem ? `## Related Roadmap Item\n\n${relatedRoadmapItem}\n` : ""}
## Acceptance Criteria

<!-- Define acceptance criteria here -->

## Implementation Notes

<!-- Add implementation notes here -->
`;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Check if a task file with the given slug already exists.
 */
async function isDuplicate(
  backlogPath: string,
  prefix: string,
  slug: string,
): Promise<boolean> {
  try {
    const files = await readdir(backlogPath);
    return files.some((f) => f === `${prefix}-${slug}.md`);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate task file or route feedback based on classification.
 */
export async function generateTaskFile(
  options: GeneratorOptions,
): Promise<GeneratorOutput> {
  const { classification, feedback, projectRoot } = options;
  const backlogPath =
    options.backlogPath ?? join(projectRoot, ".plan", "tasks", "backlog");
  const jsonlPath =
    options.jsonlPath ??
    join(projectRoot, "content", "feedback", "requests.jsonl");

  const {
    category,
    title,
    slug,
    reasoning,
    priority,
    relatedRoadmapItem,
    tags,
    answer,
  } = classification;

  switch (category) {
    case "bug": {
      // Check for duplicates
      const duplicate = await isDuplicate(backlogPath, "bug", slug);
      if (duplicate) {
        return {
          action: "task_created",
          filePath: join(backlogPath, `bug-${slug}.md`),
          isDuplicate: true,
        };
      }

      // Ensure directory exists
      await mkdir(backlogPath, { recursive: true });

      // Create bug task file
      const filePath = join(backlogPath, `bug-${slug}.md`);
      const content = buildBugTaskContent(
        title,
        feedback.content,
        feedback.source,
        priority ?? "medium",
        reasoning,
        tags,
      );
      await writeFile(filePath, content, "utf-8");

      return { action: "task_created", filePath, isDuplicate: false };
    }

    case "feature-aligned": {
      // Check for duplicates
      const duplicate = await isDuplicate(backlogPath, "feat", slug);
      if (duplicate) {
        return {
          action: "task_created",
          filePath: join(backlogPath, `feat-${slug}.md`),
          isDuplicate: true,
        };
      }

      // Ensure directory exists
      await mkdir(backlogPath, { recursive: true });

      // Create feature task file
      const filePath = join(backlogPath, `feat-${slug}.md`);
      const content = buildFeatureTaskContent(
        title,
        feedback.content,
        feedback.source,
        priority ?? "medium",
        reasoning,
        relatedRoadmapItem,
        tags,
      );
      await writeFile(filePath, content, "utf-8");

      return { action: "task_created", filePath, isDuplicate: false };
    }

    case "feature-unaligned": {
      // Append to JSONL file
      await mkdir(dirname(jsonlPath), { recursive: true });

      const entry: JsonlEntry = {
        timestamp: new Date().toISOString(),
        content: feedback.content,
        source: feedback.source,
        category,
        userId: feedback.userId ?? null,
        slug,
        tags,
      };
      await appendFile(jsonlPath, JSON.stringify(entry) + "\n", "utf-8");

      return { action: "jsonl_appended", isDuplicate: false };
    }

    case "question": {
      return {
        action: "question_answered",
        answer: answer ?? "I could not find an answer to your question.",
        isDuplicate: false,
      };
    }

    case "complaint": {
      return { action: "complaint_escalated", isDuplicate: false };
    }
  }
}
