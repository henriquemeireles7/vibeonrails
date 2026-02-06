import { z } from 'zod';

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Capabilities that an AI provider may support.
 * Use `provider.supports(capability)` before relying on provider-specific features.
 */
export const AI_CAPABILITIES = [
  'vision',
  'toolUse',
  'streaming',
  'structuredOutput',
  'systemPrompt',
] as const;

export type AICapability = (typeof AI_CAPABILITIES)[number];

export type CapabilitiesMap = Record<AICapability, boolean>;

// ---------------------------------------------------------------------------
// Provider identifiers
// ---------------------------------------------------------------------------

export const AI_PROVIDERS = ['anthropic', 'openai', 'ollama'] as const;

export type AIProviderName = (typeof AI_PROVIDERS)[number];

// ---------------------------------------------------------------------------
// Chat messages
// ---------------------------------------------------------------------------

export const ChatRoleSchema = z.enum(['system', 'user', 'assistant']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ---------------------------------------------------------------------------
// Chat options and response
// ---------------------------------------------------------------------------

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: 'stop' | 'length' | 'toolUse' | 'error';
}

export interface ChatStreamChunk {
  content: string;
  done: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Structured output options and response
// ---------------------------------------------------------------------------

export interface GenerateStructuredOptions<T extends z.ZodType> {
  prompt: string;
  schema: T;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface GenerateStructuredResponse<T> {
  data: T;
  model: string;
  usage: TokenUsage;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * The core interface every AI provider must implement.
 * Providers declare their capabilities via the capabilities map.
 */
export interface AIProvider {
  readonly name: AIProviderName;
  readonly capabilities: CapabilitiesMap;

  /**
   * Check if this provider supports a specific capability.
   */
  supports(capability: AICapability): boolean;

  /**
   * Send a chat request.
   * When stream is true, returns an async iterable of chunks.
   * When stream is false or undefined, returns a complete response.
   */
  chat(
    options: ChatOptions,
  ): Promise<ChatResponse | AsyncIterable<ChatStreamChunk>>;

  /**
   * Generate a structured JSON response validated against a Zod schema.
   */
  generateStructured<T extends z.ZodType>(
    options: GenerateStructuredOptions<T>,
  ): Promise<GenerateStructuredResponse<z.infer<T>>>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const AIConfigSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeout: z.number().int().min(1000).max(300000).default(30000),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly provider: AIProviderName,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export const AI_ERROR_CODES = [
  'AUTH_ERROR',
  'RATE_LIMIT',
  'INVALID_REQUEST',
  'MODEL_NOT_FOUND',
  'CONTEXT_LENGTH_EXCEEDED',
  'PROVIDER_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT',
  'PARSE_ERROR',
  'CAPABILITY_NOT_SUPPORTED',
] as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[number];
