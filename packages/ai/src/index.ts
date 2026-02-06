import {
  type AIProvider,
  type AIConfig,
  type AIProviderName,
  AIConfigSchema,
  AIError,
} from "./types.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createOllamaProvider } from "./providers/ollama.js";

// Re-export all types
export type {
  AIProvider,
  AIConfig,
  AIProviderName,
  AICapability,
  CapabilitiesMap,
  ChatOptions,
  ChatResponse,
  ChatStreamChunk,
  ChatMessage,
  ChatRole,
  TokenUsage,
  GenerateStructuredOptions,
  GenerateStructuredResponse,
  RetryConfig,
  AIErrorCode,
} from "./types.js";

export {
  AIConfigSchema,
  ChatMessageSchema,
  ChatRoleSchema,
  AI_CAPABILITIES,
  AI_PROVIDERS,
  AI_ERROR_CODES,
  AIError,
  DEFAULT_RETRY_CONFIG,
} from "./types.js";

// Re-export providers
export {
  createAnthropicProvider,
  createOpenAIProvider,
  createOllamaProvider,
} from "./providers/index.js";

// Re-export retry utilities
export { withRetry, isRetryableError, calculateDelay } from "./retry.js";

// Re-export AI call logging
export {
  AICallLogger,
  createAILogger,
  estimateCost,
  type AICallLogEntry,
  type AILoggerOptions,
} from "./logging.js";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const PROVIDER_FACTORIES: Record<
  AIProviderName,
  (config: AIConfig) => AIProvider
> = {
  anthropic: createAnthropicProvider,
  openai: createOpenAIProvider,
  ollama: createOllamaProvider,
};

/**
 * Environment variable mapping for auto-detection.
 * Checked in order: first match wins.
 */
const ENV_DETECTION: Array<{
  provider: AIProviderName;
  envKey: string;
  apiKeyEnv: string;
  baseUrlEnv?: string;
}> = [
  {
    provider: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    apiKeyEnv: "ANTHROPIC_API_KEY",
  },
  {
    provider: "openai",
    envKey: "OPENAI_API_KEY",
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrlEnv: "OPENAI_BASE_URL",
  },
  {
    provider: "ollama",
    envKey: "OLLAMA_HOST",
    apiKeyEnv: "OLLAMA_HOST",
    baseUrlEnv: "OLLAMA_HOST",
  },
];

/**
 * Detect AI provider configuration from environment variables.
 * Returns null if no provider is detected.
 */
export function detectProviderFromEnv(): AIConfig | null {
  // Explicit provider override
  const explicitProvider = process.env.AI_PROVIDER as
    | AIProviderName
    | undefined;

  if (explicitProvider) {
    const detection = ENV_DETECTION.find(
      (d) => d.provider === explicitProvider,
    );
    if (!detection) {
      return null;
    }

    const apiKey = process.env[detection.apiKeyEnv];
    if (!apiKey) {
      return null;
    }

    return {
      provider: explicitProvider,
      apiKey,
      baseUrl: detection.baseUrlEnv
        ? process.env[detection.baseUrlEnv]
        : undefined,
      defaultModel: process.env.AI_MODEL,
      maxRetries: 3,
      timeout: 30000,
    };
  }

  // Auto-detect from available API keys
  for (const detection of ENV_DETECTION) {
    const apiKey = process.env[detection.envKey];
    if (apiKey) {
      return {
        provider: detection.provider,
        apiKey,
        baseUrl: detection.baseUrlEnv
          ? process.env[detection.baseUrlEnv]
          : undefined,
        defaultModel: process.env.AI_MODEL,
        maxRetries: 3,
        timeout: 30000,
      };
    }
  }

  return null;
}

/**
 * Create an AI provider instance.
 *
 * If no config is provided, auto-detects from environment variables:
 * - AI_PROVIDER: explicit provider selection (anthropic, openai, ollama)
 * - ANTHROPIC_API_KEY: use Anthropic Claude
 * - OPENAI_API_KEY: use OpenAI
 * - OLLAMA_HOST: use Ollama (local)
 * - AI_MODEL: override default model for any provider
 */
export function createAI(config?: Partial<AIConfig>): AIProvider {
  let resolvedConfig: AIConfig;

  if (config?.provider && config?.apiKey) {
    // Full config provided
    const parseResult = AIConfigSchema.safeParse(config);
    if (!parseResult.success) {
      throw new AIError(
        `Invalid AI configuration: ${parseResult.error.message}`,
        "INVALID_REQUEST",
        (config.provider as AIProviderName) ?? "anthropic",
      );
    }
    resolvedConfig = parseResult.data;
  } else {
    // Auto-detect from env
    const detected = detectProviderFromEnv();
    if (!detected) {
      throw new AIError(
        "No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_HOST environment variable.",
        "AUTH_ERROR",
        "anthropic",
      );
    }

    // Merge explicit overrides with detected config
    resolvedConfig = AIConfigSchema.parse({
      ...detected,
      ...config,
    });
  }

  const factory = PROVIDER_FACTORIES[resolvedConfig.provider];
  if (!factory) {
    throw new AIError(
      `Unknown AI provider: ${resolvedConfig.provider}`,
      "INVALID_REQUEST",
      resolvedConfig.provider,
    );
  }

  return factory(resolvedConfig);
}
