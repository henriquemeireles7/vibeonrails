import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AICallLogger,
  createAILogger,
  estimateCost,
  type AICallLogEntry,
} from "./logging.js";
import type { TokenUsage, AIProviderName } from "./types.js";

describe("AI Call Logging", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = "test";
  });

  // -----------------------------------------------------------------------
  // Cost estimation
  // -----------------------------------------------------------------------

  describe("estimateCost", () => {
    it("should estimate cost for known model", () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = estimateCost("gpt-4o", usage);

      // gpt-4o: $0.0025/1K input + $0.01/1K output
      // 1000 input tokens = $0.0025, 500 output tokens = $0.005
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it("should return 0 for unknown model", () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = estimateCost("unknown-model", usage);
      expect(cost).toBe(0);
    });

    it("should return 0 for local models (ollama)", () => {
      const usage: TokenUsage = {
        promptTokens: 5000,
        completionTokens: 2000,
        totalTokens: 7000,
      };

      const cost = estimateCost("llama3", usage);
      expect(cost).toBe(0);
    });

    it("should use prefix matching for model variants", () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 1000,
        totalTokens: 2000,
      };

      // gpt-4o-2024-01-01 should match gpt-4o prefix
      const cost = estimateCost("gpt-4o-2024-01-01", usage);
      expect(cost).toBeGreaterThan(0);
    });

    it("should use custom cost table when provided", () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 1000,
        totalTokens: 2000,
      };

      const customTable = {
        "my-model": { input: 0.01, output: 0.02 },
      };

      const cost = estimateCost("my-model", usage, customTable);
      // 1000/1000 * 0.01 + 1000/1000 * 0.02 = 0.03
      expect(cost).toBeCloseTo(0.03, 4);
    });
  });

  // -----------------------------------------------------------------------
  // AICallLogger
  // -----------------------------------------------------------------------

  describe("AICallLogger", () => {
    function makeEntry(
      overrides: Partial<
        Omit<AICallLogEntry, "timestamp" | "estimatedCostUsd">
      > = {},
    ) {
      return {
        provider: "anthropic" as AIProviderName,
        model: "claude-sonnet-4-20250514",
        durationMs: 1200,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        success: true,
        ...overrides,
      };
    }

    it("should log AI call with all metadata", () => {
      const entries: AICallLogEntry[] = [];
      const logger = new AICallLogger({
        writer: (entry) => entries.push(entry),
      });

      logger.log(makeEntry());

      expect(entries).toHaveLength(1);
      expect(entries[0].provider).toBe("anthropic");
      expect(entries[0].model).toBe("claude-sonnet-4-20250514");
      expect(entries[0].durationMs).toBe(1200);
      expect(entries[0].usage.totalTokens).toBe(150);
      expect(entries[0].timestamp).toBeTruthy();
      expect(typeof entries[0].estimatedCostUsd).toBe("number");
    });

    it("should calculate cost estimate", () => {
      const entries: AICallLogEntry[] = [];
      const logger = new AICallLogger({
        writer: (entry) => entries.push(entry),
      });

      logger.log(
        makeEntry({
          model: "gpt-4o",
          usage: {
            promptTokens: 1000,
            completionTokens: 500,
            totalTokens: 1500,
          },
        }),
      );

      expect(entries[0].estimatedCostUsd).toBeGreaterThan(0);
    });

    it("should include full content in dev mode", () => {
      const entries: AICallLogEntry[] = [];
      const logger = new AICallLogger({
        logFullContent: true,
        writer: (entry) => entries.push(entry),
      });

      logger.log(
        makeEntry({
          prompt: "What is 2+2?",
          response: "4",
        }),
      );

      expect(entries[0].prompt).toBe("What is 2+2?");
      expect(entries[0].response).toBe("4");
    });

    it("should strip content in production mode", () => {
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line) => lines.push(line));

      const logger = new AICallLogger({
        logFullContent: false,
      });

      logger.log(
        makeEntry({
          prompt: "secret prompt",
          response: "secret response",
        }),
      );

      expect(lines).toHaveLength(1);
      const parsed = JSON.parse(lines[0]);
      expect(parsed.prompt).toBeUndefined();
      expect(parsed.response).toBeUndefined();
    });

    it("should log failed calls with error message", () => {
      const entries: AICallLogEntry[] = [];
      const logger = new AICallLogger({
        writer: (entry) => entries.push(entry),
      });

      logger.log(
        makeEntry({
          success: false,
          error: "Rate limit exceeded",
          usage: { promptTokens: 100, completionTokens: 0, totalTokens: 100 },
        }),
      );

      expect(entries[0].success).toBe(false);
      expect(entries[0].error).toBe("Rate limit exceeded");
    });

    it("should include requestId when provided", () => {
      const entries: AICallLogEntry[] = [];
      const logger = new AICallLogger({
        writer: (entry) => entries.push(entry),
      });

      logger.log(makeEntry({ requestId: "req-abc-123" }));

      expect(entries[0].requestId).toBe("req-abc-123");
    });

    // -------------------------------------------------------------------
    // Session summary
    // -------------------------------------------------------------------

    it("should track session totals", () => {
      const logger = new AICallLogger({
        writer: () => {}, // noop
      });

      logger.log(
        makeEntry({
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        }),
      );
      logger.log(
        makeEntry({
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        }),
      );

      const summary = logger.getSummary();
      expect(summary.totalCalls).toBe(2);
      expect(summary.totalTokens).toBe(450);
      expect(summary.totalCostUsd).toBeGreaterThan(0);
    });

    it("should reset session counters", () => {
      const logger = new AICallLogger({
        writer: () => {},
      });

      logger.log(makeEntry());
      logger.reset();

      const summary = logger.getSummary();
      expect(summary.totalCalls).toBe(0);
      expect(summary.totalTokens).toBe(0);
      expect(summary.totalCostUsd).toBe(0);
    });

    // -------------------------------------------------------------------
    // Factory
    // -------------------------------------------------------------------

    it("should create logger via factory function", () => {
      const entries: AICallLogEntry[] = [];
      const logger = createAILogger({
        writer: (entry) => entries.push(entry),
      });

      logger.log(makeEntry());

      expect(entries).toHaveLength(1);
    });
  });
});
