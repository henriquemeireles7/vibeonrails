/**
 * Support Feedback — Generator Tests
 *
 * Tests for task file creation, JSONL appending,
 * slug generation, and deduplication.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { generateTaskFile } from "./generator.js";
import type { ClassificationResult, FeedbackInput } from "./types.js";

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

const TEST_ROOT = join(process.cwd(), ".test-feedback-generator");
const BACKLOG_PATH = join(TEST_ROOT, ".plan", "tasks", "backlog");
const JSONL_PATH = join(TEST_ROOT, "content", "feedback", "requests.jsonl");

const baseFeedback: FeedbackInput = {
  content: "The login page crashes on Safari",
  source: "chat",
  userId: "user_123",
  userEmail: null,
  sessionId: null,
  metadata: {},
};

function makeClassification(
  overrides: Partial<ClassificationResult> = {},
): ClassificationResult {
  return {
    category: "bug",
    confidence: 0.9,
    title: "Login crash on Safari",
    slug: "login-crash-safari",
    reasoning: "User reports a crash bug",
    priority: "high",
    tags: ["login", "safari"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateTaskFile", () => {
  beforeEach(async () => {
    await mkdir(TEST_ROOT, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  describe("bug classification", () => {
    it("should create a bug task file", async () => {
      const result = await generateTaskFile({
        classification: makeClassification(),
        feedback: baseFeedback,
        projectRoot: TEST_ROOT,
      });

      expect(result.action).toBe("task_created");
      expect(result.filePath).toContain("bug-login-crash-safari.md");
      expect(result.isDuplicate).toBe(false);

      // Verify file content
      const content = await readFile(result.filePath!, "utf-8");
      expect(content).toContain('title: "Login crash on Safari"');
      expect(content).toContain("type: bug");
      expect(content).toContain("priority: high");
      expect(content).toContain("The login page crashes on Safari");
    });

    it("should detect duplicate bug files", async () => {
      // Create first file
      await generateTaskFile({
        classification: makeClassification(),
        feedback: baseFeedback,
        projectRoot: TEST_ROOT,
      });

      // Try to create duplicate
      const result = await generateTaskFile({
        classification: makeClassification(),
        feedback: baseFeedback,
        projectRoot: TEST_ROOT,
      });

      expect(result.isDuplicate).toBe(true);
    });
  });

  describe("feature-aligned classification", () => {
    it("should create a feature task file", async () => {
      const result = await generateTaskFile({
        classification: makeClassification({
          category: "feature-aligned",
          title: "Add dark mode",
          slug: "add-dark-mode",
          relatedRoadmapItem: "UI Improvements Q2",
        }),
        feedback: {
          ...baseFeedback,
          content: "Please add dark mode",
        },
        projectRoot: TEST_ROOT,
      });

      expect(result.action).toBe("task_created");
      expect(result.filePath).toContain("feat-add-dark-mode.md");

      const content = await readFile(result.filePath!, "utf-8");
      expect(content).toContain("type: feature");
      expect(content).toContain('relatedTo: "UI Improvements Q2"');
    });
  });

  describe("feature-unaligned classification", () => {
    it("should append to JSONL file", async () => {
      const result = await generateTaskFile({
        classification: makeClassification({
          category: "feature-unaligned",
          title: "Add blockchain",
          slug: "add-blockchain",
        }),
        feedback: {
          ...baseFeedback,
          content: "Add blockchain support",
        },
        projectRoot: TEST_ROOT,
      });

      expect(result.action).toBe("jsonl_appended");

      // Verify JSONL content
      const content = await readFile(JSONL_PATH, "utf-8");
      const entry = JSON.parse(content.trim()) as Record<string, unknown>;
      expect(entry.category).toBe("feature-unaligned");
      expect(entry.content).toBe("Add blockchain support");
      expect(entry.slug).toBe("add-blockchain");
    });

    it("should append multiple entries to JSONL", async () => {
      await generateTaskFile({
        classification: makeClassification({
          category: "feature-unaligned",
          slug: "first-request",
        }),
        feedback: { ...baseFeedback, content: "First request" },
        projectRoot: TEST_ROOT,
      });

      await generateTaskFile({
        classification: makeClassification({
          category: "feature-unaligned",
          slug: "second-request",
        }),
        feedback: { ...baseFeedback, content: "Second request" },
        projectRoot: TEST_ROOT,
      });

      const content = await readFile(JSONL_PATH, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines).toHaveLength(2);
    });
  });

  describe("question classification", () => {
    it("should return answer without creating files", async () => {
      const result = await generateTaskFile({
        classification: makeClassification({
          category: "question",
          answer: "Go to Settings > Account > Reset Password",
        }),
        feedback: {
          ...baseFeedback,
          content: "How do I reset my password?",
        },
        projectRoot: TEST_ROOT,
      });

      expect(result.action).toBe("question_answered");
      expect(result.answer).toBe("Go to Settings > Account > Reset Password");
    });

    it("should provide default answer when none given", async () => {
      const result = await generateTaskFile({
        classification: makeClassification({
          category: "question",
        }),
        feedback: baseFeedback,
        projectRoot: TEST_ROOT,
      });

      expect(result.action).toBe("question_answered");
      expect(result.answer).toBeDefined();
    });
  });

  describe("complaint classification", () => {
    it("should escalate without creating files", async () => {
      const result = await generateTaskFile({
        classification: makeClassification({
          category: "complaint",
        }),
        feedback: {
          ...baseFeedback,
          content: "This is terrible!",
        },
        projectRoot: TEST_ROOT,
      });

      expect(result.action).toBe("complaint_escalated");
    });
  });
});
