/**
 * Support Feedback — Classifier Tests
 *
 * Tests for AI feedback classification with fixture responses.
 * Tests output routing for each classification category.
 */

import { describe, it, expect, vi } from "vitest";
import { classifyFeedback, generateSlug } from "./classifier.js";
import type { FeedbackInput } from "./types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseFeedback: FeedbackInput = {
  content: "The login page crashes on Safari",
  source: "chat",
  userId: "user_123",
  userEmail: null,
  sessionId: null,
  metadata: {},
};

function createMockGenerate(response: Record<string, unknown>) {
  return vi.fn().mockResolvedValue(JSON.stringify(response));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateSlug", () => {
  it("should generate a slug from a title", () => {
    expect(generateSlug("Login Page Crashes on Safari")).toBe(
      "login-page-crashes-on-safari",
    );
  });

  it("should handle special characters", () => {
    expect(generateSlug("Can't reset password! (urgent)")).toBe(
      "cant-reset-password-urgent",
    );
  });

  it("should truncate long slugs", () => {
    const longTitle = "a".repeat(100);
    expect(generateSlug(longTitle).length).toBeLessThanOrEqual(60);
  });

  it("should handle empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("should collapse multiple hyphens", () => {
    expect(generateSlug("hello --- world")).toBe("hello-world");
  });

  it("should be deterministic", () => {
    const slug1 = generateSlug("Same Input Every Time");
    const slug2 = generateSlug("Same Input Every Time");
    expect(slug1).toBe(slug2);
  });
});

describe("classifyFeedback", () => {
  it("should classify a bug report", async () => {
    const generate = createMockGenerate({
      category: "bug",
      confidence: 0.95,
      title: "Login page crash on Safari",
      slug: "login-page-crash-safari",
      reasoning: "User reports a crash, indicating a software bug",
      priority: "high",
      tags: ["login", "safari", "crash"],
    });

    const result = await classifyFeedback({
      feedback: baseFeedback,
      projectRoot: "/tmp/test-project",
      generate,
    });

    expect(result.category).toBe("bug");
    expect(result.confidence).toBe(0.95);
    expect(result.slug).toBe("login-page-crash-safari");
    expect(result.priority).toBe("high");
  });

  it("should classify a feature request aligned with roadmap", async () => {
    const generate = createMockGenerate({
      category: "feature-aligned",
      confidence: 0.8,
      title: "Add dark mode support",
      slug: "add-dark-mode-support",
      reasoning: "Dark mode is mentioned in the roadmap under UI improvements",
      priority: "medium",
      relatedRoadmapItem: "UI Improvements Q2",
      tags: ["ui", "dark-mode"],
    });

    const result = await classifyFeedback({
      feedback: {
        ...baseFeedback,
        content: "Please add dark mode, it would be great!",
      },
      projectRoot: "/tmp/test-project",
      generate,
    });

    expect(result.category).toBe("feature-aligned");
    expect(result.relatedRoadmapItem).toBe("UI Improvements Q2");
  });

  it("should classify an unaligned feature request", async () => {
    const generate = createMockGenerate({
      category: "feature-unaligned",
      confidence: 0.7,
      title: "Add blockchain integration",
      slug: "add-blockchain-integration",
      reasoning: "Blockchain is not mentioned in any roadmap items",
      tags: ["blockchain"],
    });

    const result = await classifyFeedback({
      feedback: {
        ...baseFeedback,
        content: "You should add blockchain support",
      },
      projectRoot: "/tmp/test-project",
      generate,
    });

    expect(result.category).toBe("feature-unaligned");
  });

  it("should classify a question", async () => {
    const generate = createMockGenerate({
      category: "question",
      confidence: 0.9,
      title: "How to reset password",
      slug: "how-to-reset-password",
      reasoning: "User is asking a how-to question",
      answer: "Go to Settings > Account > Reset Password",
      tags: ["password", "account"],
    });

    const result = await classifyFeedback({
      feedback: {
        ...baseFeedback,
        content: "How do I reset my password?",
      },
      projectRoot: "/tmp/test-project",
      generate,
    });

    expect(result.category).toBe("question");
    expect(result.answer).toBe("Go to Settings > Account > Reset Password");
  });

  it("should classify a complaint", async () => {
    const generate = createMockGenerate({
      category: "complaint",
      confidence: 0.85,
      title: "Frustrated with slow performance",
      slug: "frustrated-with-slow-performance",
      reasoning:
        "User is expressing frustration without specific actionable feedback",
      tags: ["performance", "frustration"],
    });

    const result = await classifyFeedback({
      feedback: {
        ...baseFeedback,
        content: "This app is so slow, it is terrible!",
      },
      projectRoot: "/tmp/test-project",
      generate,
    });

    expect(result.category).toBe("complaint");
  });

  it("should handle invalid AI response gracefully", async () => {
    const generate = vi.fn().mockResolvedValue("not valid json");

    const result = await classifyFeedback({
      feedback: baseFeedback,
      projectRoot: "/tmp/test-project",
      generate,
    });

    // Should fallback to question category
    expect(result.category).toBe("question");
    expect(result.confidence).toBe(0.3);
    expect(result.reasoning).toContain("AI classification failed");
  });

  it("should pass project context to AI", async () => {
    const generate = createMockGenerate({
      category: "bug",
      confidence: 0.9,
      title: "Test bug",
      slug: "test-bug",
      reasoning: "Test reasoning",
      tags: [],
    });

    await classifyFeedback({
      feedback: baseFeedback,
      projectRoot: "/tmp/test-project",
      generate,
    });

    // The generate function should have been called with the feedback content
    expect(generate).toHaveBeenCalledWith(
      expect.stringContaining("The login page crashes on Safari"),
      expect.any(String),
    );
  });

  it("should include source in prompt", async () => {
    const generate = createMockGenerate({
      category: "bug",
      confidence: 0.9,
      title: "Test",
      slug: "test",
      reasoning: "Test",
      tags: [],
    });

    await classifyFeedback({
      feedback: { ...baseFeedback, source: "github" },
      projectRoot: "/tmp/test-project",
      generate,
    });

    expect(generate).toHaveBeenCalledWith(
      expect.stringContaining("Source: github"),
      expect.any(String),
    );
  });
});
