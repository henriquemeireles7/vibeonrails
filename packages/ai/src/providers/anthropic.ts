import { z } from 'zod';
import {
  type AIProvider,
  type AIConfig,
  type CapabilitiesMap,
  type ChatOptions,
  type ChatResponse,
  type ChatStreamChunk,
  type GenerateStructuredOptions,
  type GenerateStructuredResponse,
  type AICapability,
  type ChatMessage,
  AIError,
} from '../types.js';
import { withRetry } from '../retry.js';

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_API_VERSION = '2023-06-01';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  temperature?: number;
  stream?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Convert VoR chat messages to Anthropic format.
 * Anthropic uses a separate system parameter, not a system message in the array.
 */
function toAnthropicMessages(
  messages: ChatMessage[],
): { messages: AnthropicMessage[]; system?: string } {
  let system: string | undefined;
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = msg.content;
    } else {
      anthropicMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  }

  return { messages: anthropicMessages, system };
}

/**
 * Map Anthropic error status codes to VoR error codes.
 */
function mapAnthropicError(
  status: number,
  body: string,
): AIError {
  const parsed = safeJsonParse(body);
  const errorObj = parsed?.error as Record<string, unknown> | undefined;
  const message =
    (errorObj?.message as string) ?? `Anthropic API error (status ${status})`;

  switch (status) {
    case 401:
      return new AIError(message, 'AUTH_ERROR', 'anthropic');
    case 429:
      return new AIError(message, 'RATE_LIMIT', 'anthropic');
    case 400:
      if (message.includes('context length') || message.includes('token')) {
        return new AIError(message, 'CONTEXT_LENGTH_EXCEEDED', 'anthropic');
      }
      return new AIError(message, 'INVALID_REQUEST', 'anthropic');
    case 404:
      return new AIError(message, 'MODEL_NOT_FOUND', 'anthropic');
    default:
      return new AIError(message, 'PROVIDER_ERROR', 'anthropic');
  }
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createAnthropicProvider(config: AIConfig): AIProvider {
  const baseUrl = config.baseUrl ?? ANTHROPIC_BASE_URL;
  const defaultModel = config.defaultModel ?? ANTHROPIC_DEFAULT_MODEL;
  const retryConfig = {
    maxRetries: config.maxRetries,
    baseDelay: 1000,
    maxDelay: 10000,
  };

  const capabilities: CapabilitiesMap = {
    vision: true,
    toolUse: true,
    streaming: true,
    structuredOutput: true,
    systemPrompt: true,
  };

  async function makeRequest(
    body: AnthropicRequest,
  ): Promise<Response> {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw mapAnthropicError(response.status, errorBody);
    }

    return response;
  }

  async function chatNonStreaming(
    options: ChatOptions,
  ): Promise<ChatResponse> {
    const { messages, system } = toAnthropicMessages(options.messages);

    if (options.systemPrompt) {
      // Explicit systemPrompt takes precedence
    }

    const body: AnthropicRequest = {
      model: options.model ?? defaultModel,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      system: options.systemPrompt ?? system,
      temperature: options.temperature,
      stream: false,
    };

    return withRetry(async () => {
      const response = await makeRequest(body);
      const data = (await response.json()) as AnthropicResponse;

      return {
        content: data.content.map((c) => c.text).join(''),
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens:
            data.usage.input_tokens + data.usage.output_tokens,
        },
        finishReason: mapFinishReason(data.stop_reason),
      };
    }, 'anthropic', retryConfig);
  }

  async function chatStreaming(
    options: ChatOptions,
  ): Promise<AsyncIterable<ChatStreamChunk>> {
    const { messages, system } = toAnthropicMessages(options.messages);

    const body: AnthropicRequest = {
      model: options.model ?? defaultModel,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      system: options.systemPrompt ?? system,
      temperature: options.temperature,
      stream: true,
    };

    const response = await withRetry(
      () => makeRequest(body),
      'anthropic',
      retryConfig,
    );

    return parseSSEStream(response);
  }

  async function* parseSSEStream(
    response: Response,
  ): AsyncIterable<ChatStreamChunk> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIError(
        'No response body for streaming',
        'PROVIDER_ERROR',
        'anthropic',
      );
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            const parsed = safeJsonParse(data);
            if (!parsed) continue;

            const type = parsed.type as string;

            if (type === 'content_block_delta') {
              const delta = parsed.delta as Record<string, unknown>;
              if (delta?.text) {
                yield {
                  content: delta.text as string,
                  done: false,
                };
              }
            } else if (type === 'message_stop') {
              yield { content: '', done: true };
              return;
            }
          }
        }
      }

      // If we get here without a message_stop, signal completion
      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  function mapFinishReason(
    reason: string,
  ): ChatResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'toolUse';
      default:
        return 'stop';
    }
  }

  const provider: AIProvider = {
    name: 'anthropic',
    capabilities,

    supports(capability: AICapability): boolean {
      return capabilities[capability] ?? false;
    },

    async chat(
      options: ChatOptions,
    ): Promise<ChatResponse | AsyncIterable<ChatStreamChunk>> {
      if (options.stream) {
        return chatStreaming(options);
      }
      return chatNonStreaming(options);
    },

    async generateStructured<T extends z.ZodType>(
      options: GenerateStructuredOptions<T>,
    ): Promise<GenerateStructuredResponse<z.infer<T>>> {
      const jsonSchema = zodToJsonDescription(options.schema);

      const systemPrompt = [
        options.systemPrompt ?? '',
        `You must respond with valid JSON matching this schema: ${jsonSchema}`,
        'Respond ONLY with the JSON object, no markdown, no explanation.',
      ]
        .filter(Boolean)
        .join('\n');

      const chatResponse = await chatNonStreaming({
        messages: [{ role: 'user', content: options.prompt }],
        model: options.model,
        temperature: options.temperature ?? 0,
        maxTokens: options.maxTokens,
        systemPrompt,
      });

      const cleanedContent = chatResponse.content
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/```\s*$/m, '')
        .trim();

      let rawData: unknown;
      try {
        rawData = JSON.parse(cleanedContent);
      } catch {
        throw new AIError(
          `Failed to parse AI response as JSON: ${cleanedContent.slice(0, 200)}`,
          'PARSE_ERROR',
          'anthropic',
        );
      }

      const parseResult = options.schema.safeParse(rawData);
      if (!parseResult.success) {
        throw new AIError(
          `AI response does not match schema: ${parseResult.error.message}`,
          'PARSE_ERROR',
          'anthropic',
        );
      }

      return {
        data: parseResult.data as z.infer<T>,
        model: chatResponse.model,
        usage: chatResponse.usage,
      };
    },
  };

  return provider;
}

/**
 * Generate a human-readable description of a Zod schema for AI prompts.
 */
function zodToJsonDescription(schema: z.ZodType): string {
  try {
    // Use Zod's built-in description capabilities
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape as Record<string, z.ZodType>;
      const fields = Object.entries(shape).map(([key, value]) => {
        const desc = value.description ?? inferZodType(value);
        return `"${key}": ${desc}`;
      });
      return `{ ${fields.join(', ')} }`;
    }
    return schema.description ?? 'any valid JSON';
  } catch {
    return 'a valid JSON object';
  }
}

function inferZodType(schema: z.ZodType): string {
  if (schema instanceof z.ZodString) return '"string"';
  if (schema instanceof z.ZodNumber) return '"number"';
  if (schema instanceof z.ZodBoolean) return '"boolean"';
  if (schema instanceof z.ZodArray) return '"array"';
  if (schema instanceof z.ZodObject) return '"object"';
  if (schema instanceof z.ZodOptional)
    return `${inferZodType((schema as z.ZodOptional<z.ZodType>).unwrap())} (optional)`;
  return '"unknown"';
}
