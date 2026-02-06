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

const OLLAMA_BASE_URL = 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = 'llama3.1';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
  format?: 'json';
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
}

/**
 * Convert VoR chat messages to Ollama format.
 * Ollama supports system, user, and assistant roles directly.
 */
function toOllamaMessages(
  messages: ChatMessage[],
  systemPrompt?: string,
): OllamaMessage[] {
  const ollamaMessages: OllamaMessage[] = [];

  if (systemPrompt) {
    ollamaMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    ollamaMessages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return ollamaMessages;
}

/**
 * Map Ollama errors to VoR error codes.
 */
function mapOllamaError(status: number, body: string): AIError {
  const parsed = safeJsonParse(body);
  const message =
    (parsed?.error as string) ?? `Ollama API error (status ${status})`;

  switch (status) {
    case 404:
      return new AIError(message, 'MODEL_NOT_FOUND', 'ollama');
    case 400:
      return new AIError(message, 'INVALID_REQUEST', 'ollama');
    default:
      return new AIError(message, 'PROVIDER_ERROR', 'ollama');
  }
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createOllamaProvider(config: AIConfig): AIProvider {
  const baseUrl = config.baseUrl ?? OLLAMA_BASE_URL;
  const defaultModel = config.defaultModel ?? OLLAMA_DEFAULT_MODEL;
  const retryConfig = {
    maxRetries: config.maxRetries,
    baseDelay: 1000,
    maxDelay: 10000,
  };

  // Ollama has reduced capabilities compared to cloud providers
  const capabilities: CapabilitiesMap = {
    vision: false,
    toolUse: false,
    streaming: true,
    structuredOutput: true,
    systemPrompt: true,
  };

  async function makeRequest(body: OllamaChatRequest): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(config.timeout),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new AIError('Request timed out', 'TIMEOUT', 'ollama', error);
      }
      throw new AIError(
        `Failed to connect to Ollama at ${baseUrl}. Is Ollama running?`,
        'NETWORK_ERROR',
        'ollama',
        error,
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw mapOllamaError(response.status, errorBody);
    }

    return response;
  }

  async function chatNonStreaming(
    options: ChatOptions,
  ): Promise<ChatResponse> {
    const messages = toOllamaMessages(
      options.messages,
      options.systemPrompt,
    );

    const body: OllamaChatRequest = {
      model: options.model ?? defaultModel,
      messages,
      stream: false,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens,
      },
    };

    return withRetry(async () => {
      const response = await makeRequest(body);
      const data = (await response.json()) as OllamaChatResponse;

      return {
        content: data.message.content,
        model: data.model,
        usage: {
          promptTokens: data.prompt_eval_count ?? 0,
          completionTokens: data.eval_count ?? 0,
          totalTokens:
            (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
        finishReason: 'stop' as const,
      };
    }, 'ollama', retryConfig);
  }

  async function chatStreaming(
    options: ChatOptions,
  ): Promise<AsyncIterable<ChatStreamChunk>> {
    const messages = toOllamaMessages(
      options.messages,
      options.systemPrompt,
    );

    const body: OllamaChatRequest = {
      model: options.model ?? defaultModel,
      messages,
      stream: true,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens,
      },
    };

    const response = await withRetry(
      () => makeRequest(body),
      'ollama',
      retryConfig,
    );

    return parseNDJSONStream(response);
  }

  async function* parseNDJSONStream(
    response: Response,
  ): AsyncIterable<ChatStreamChunk> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIError(
        'No response body for streaming',
        'PROVIDER_ERROR',
        'ollama',
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
          const trimmed = line.trim();
          if (!trimmed) continue;

          const parsed = safeJsonParse(trimmed) as OllamaChatResponse | null;
          if (!parsed) continue;

          if (parsed.done) {
            yield { content: '', done: true };
            return;
          }

          if (parsed.message?.content) {
            yield {
              content: parsed.message.content,
              done: false,
            };
          }
        }
      }

      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  const provider: AIProvider = {
    name: 'ollama',
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
      const systemPrompt = [
        options.systemPrompt ?? '',
        'You must respond with valid JSON only. No markdown, no explanation.',
      ]
        .filter(Boolean)
        .join('\n');

      const messages = toOllamaMessages(
        [{ role: 'user', content: options.prompt }],
        systemPrompt,
      );

      const body: OllamaChatRequest = {
        model: options.model ?? defaultModel,
        messages,
        stream: false,
        format: 'json',
        options: {
          temperature: options.temperature ?? 0,
          num_predict: options.maxTokens,
        },
      };

      const chatResponse = await withRetry(async () => {
        const response = await makeRequest(body);
        const data = (await response.json()) as OllamaChatResponse;

        return {
          content: data.message.content,
          model: data.model,
          usage: {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count ?? 0,
            totalTokens:
              (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
          },
        };
      }, 'ollama', retryConfig);

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
          'ollama',
        );
      }

      const parseResult = options.schema.safeParse(rawData);
      if (!parseResult.success) {
        throw new AIError(
          `AI response does not match schema: ${parseResult.error.message}`,
          'PARSE_ERROR',
          'ollama',
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
