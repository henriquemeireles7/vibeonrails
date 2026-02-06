/**
 * AI Call Logging
 *
 * Logs every AI SDK call with metadata: prompt tokens, completion tokens,
 * duration, model, provider, and cost estimate.
 *
 * - Dev mode: full prompt/response to .vibe/ai-logs/ directory
 * - Production: metadata only (no prompt/response content)
 *
 * Usage:
 *   import { createAILogger, wrapProviderWithLogging } from '@vibeonrails/ai';
 *
 *   const aiLog = createAILogger();
 *   const provider = wrapProviderWithLogging(rawProvider, aiLog);
 */

import type { AIProviderName, TokenUsage } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Cost per 1K tokens for popular models (USD).
 * Used for cost estimation. Updated periodically.
 */
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  // OpenAI
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  // Ollama — local, free
  'llama3': { input: 0, output: 0 },
  'mistral': { input: 0, output: 0 },
};

/**
 * Log entry for a single AI call.
 */
export interface AICallLogEntry {
  /** Timestamp of the call */
  timestamp: string;
  /** AI provider name */
  provider: AIProviderName;
  /** Model used */
  model: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Token usage */
  usage: TokenUsage;
  /** Estimated cost in USD */
  estimatedCostUsd: number;
  /** Request ID for tracing */
  requestId?: string;
  /** Whether the call was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Full prompt (dev mode only) */
  prompt?: string;
  /** Full response (dev mode only) */
  response?: string;
}

/**
 * Options for the AI logger.
 */
export interface AILoggerOptions {
  /** Whether to log full prompts/responses (default: true in dev) */
  logFullContent?: boolean;
  /** Custom writer for log entries (default: console.log JSON) */
  writer?: (entry: AICallLogEntry) => void;
  /** Custom cost table override */
  costTable?: Record<string, { input: number; output: number }>;
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

/**
 * Estimate the cost of an AI call in USD.
 */
export function estimateCost(
  model: string,
  usage: TokenUsage,
  costTable?: Record<string, { input: number; output: number }>,
): number {
  const table = costTable ?? COST_PER_1K_TOKENS;

  // Try exact match first, then prefix match
  let costs = table[model];
  if (!costs) {
    const prefix = Object.keys(table).find((k) => model.startsWith(k));
    costs = prefix ? table[prefix] : undefined;
  }

  if (!costs) {
    return 0; // Unknown model, no estimate
  }

  const inputCost = (usage.promptTokens / 1000) * costs.input;
  const outputCost = (usage.completionTokens / 1000) * costs.output;

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
}

// ---------------------------------------------------------------------------
// AI Logger
// ---------------------------------------------------------------------------

export class AICallLogger {
  private readonly logFullContent: boolean;
  private readonly writer: (entry: AICallLogEntry) => void;
  private readonly costTable: Record<string, { input: number; output: number }>;

  /** Running totals for the session */
  private totalCalls = 0;
  private totalTokens = 0;
  private totalCostUsd = 0;

  constructor(options: AILoggerOptions = {}) {
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    this.logFullContent = options.logFullContent ?? isDev;
    this.costTable = options.costTable ?? COST_PER_1K_TOKENS;
    this.writer = options.writer ?? ((entry) => {
      // Default: structured JSON to stdout
      const output = { ...entry };
      if (!this.logFullContent) {
        delete output.prompt;
        delete output.response;
      }
      console.log(JSON.stringify({ type: 'ai_call', ...output }));
    });
  }

  /**
   * Log a completed AI call.
   */
  log(entry: Omit<AICallLogEntry, 'timestamp' | 'estimatedCostUsd'>): void {
    const estimatedCostUsd = estimateCost(entry.model, entry.usage, this.costTable);

    const fullEntry: AICallLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      estimatedCostUsd,
    };

    // Update running totals
    this.totalCalls++;
    this.totalTokens += entry.usage.totalTokens;
    this.totalCostUsd += estimatedCostUsd;

    this.writer(fullEntry);
  }

  /**
   * Get session summary statistics.
   */
  getSummary(): {
    totalCalls: number;
    totalTokens: number;
    totalCostUsd: number;
  } {
    return {
      totalCalls: this.totalCalls,
      totalTokens: this.totalTokens,
      totalCostUsd: Math.round(this.totalCostUsd * 1_000_000) / 1_000_000,
    };
  }

  /**
   * Reset session counters.
   */
  reset(): void {
    this.totalCalls = 0;
    this.totalTokens = 0;
    this.totalCostUsd = 0;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an AI call logger.
 *
 * @example
 *   const aiLog = createAILogger();
 *   aiLog.log({
 *     provider: 'anthropic',
 *     model: 'claude-sonnet-4-20250514',
 *     durationMs: 1200,
 *     usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
 *     success: true,
 *   });
 */
export function createAILogger(options?: AILoggerOptions): AICallLogger {
  return new AICallLogger(options);
}
