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

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_DEFAULT_MODEL = 'gpt-4o';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  response_format?: { type: string };
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Convert VoR chat messages to OpenAI format.
 * OpenAI supports system messages directly in the messages array.
 */
function toOpenAIMessages(
  messages: ChatMessage[],
  systemPrompt?: string,
): OpenAIMessage[] {
  const openaiMessages: OpenAIMessage[] = [];

  if (systemPrompt) {
    openaiMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    openaiMessages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return openaiMessages;
}

/**
 * Map OpenAI error status codes to VoR error codes.
 */
function mapOpenAIError(status: number, body: string): AIError {
  const parsed = safeJsonParse(body);
  const message =
    (parsed?.error as Record<string, unknown>)?.message as string ??
    `OpenAI API error (status ${status})`;

  switch (status) {
    case 401:
      return new AIError(message, 'AUTH_ERROR', 'openai');
    case 429:
      return new AIError(message, 'RATE_LIMIT', 'openai');
    case 400:
      if (
        message.includes('context_length_exceeded') ||
        message.includes('maximum context length')
      ) {
        return new AIError(message, 'CONTEXT_LENGTH_EXCEEDED', 'openai');
      }
      return new AIError(message, 'INVALID_REQUEST', 'openai');
    case 404:
      return new AIError(message, 'MODEL_NOT_FOUND', 'openai');
    default:
      return new AIError(message, 'PROVIDER_ERROR', 'openai');
  }
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createOpenAIProvider(config: AIConfig): AIProvider {
  const baseUrl = config.baseUrl ?? OPENAI_BASE_URL;
  const defaultModel = config.defaultModel ?? OPENAI_DEFAULT_MODEL;
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

  async function makeRequest(body: OpenAIRequest): Promise<Response> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw mapOpenAIError(response.status, errorBody);
    }

    return response;
  }

  async function chatNonStreaming(
    options: ChatOptions,
  ): Promise<ChatResponse> {
    const messages = toOpenAIMessages(
      options.messages,
      options.systemPrompt,
    );

    const body: OpenAIRequest = {
      model: options.model ?? defaultModel,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature,
      stream: false,
    };

    return withRetry(async () => {
      const response = await makeRequest(body);
      const data = (await response.json()) as OpenAIResponse;

      const choice = data.choices[0];
      if (!choice) {
        throw new AIError(
          'No choices in OpenAI response',
          'PROVIDER_ERROR',
          'openai',
        );
      }

      return {
        content: choice.message.content,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: mapFinishReason(choice.finish_reason),
      };
    }, 'openai', retryConfig);
  }

  async function chatStreaming(
    options: ChatOptions,
  ): Promise<AsyncIterable<ChatStreamChunk>> {
    const messages = toOpenAIMessages(
      options.messages,
      options.systemPrompt,
    );

    const body: OpenAIRequest = {
      model: options.model ?? defaultModel,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature,
      stream: true,
    };

    const response = await withRetry(
      () => makeRequest(body),
      'openai',
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
        'openai',
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

            const choices = parsed.choices as Array<Record<string, unknown>>;
            if (choices?.[0]) {
              const delta = choices[0].delta as Record<string, unknown>;
              if (delta?.content) {
                yield {
                  content: delta.content as string,
                  done: false,
                };
              }

              if (choices[0].finish_reason) {
                yield { content: '', done: true };
                return;
              }
            }
          }
        }
      }

      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  function mapFinishReason(
    reason: string,
  ): ChatResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
      case 'function_call':
        return 'toolUse';
      default:
        return 'stop';
    }
  }

  const provider: AIProvider = {
    name: 'openai',
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

      const messages = toOpenAIMessages(
        [{ role: 'user', content: options.prompt }],
        systemPrompt,
      );

      const body: OpenAIRequest = {
        model: options.model ?? defaultModel,
        messages,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0,
        stream: false,
        response_format: { type: 'json_object' },
      };

      const chatResponse = await withRetry(async () => {
        const response = await makeRequest(body);
        const data = (await response.json()) as OpenAIResponse;
        const choice = data.choices[0];

        if (!choice) {
          throw new AIError(
            'No choices in OpenAI response',
            'PROVIDER_ERROR',
            'openai',
          );
        }

        return {
          content: choice.message.content,
          model: data.model,
          usage: {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
        };
      }, 'openai', retryConfig);

      let rawData: unknown;
      try {
        rawData = JSON.parse(chatResponse.content);
      } catch {
        throw new AIError(
          `Failed to parse AI response as JSON: ${chatResponse.content.slice(0, 200)}`,
          'PARSE_ERROR',
          'openai',
        );
      }

      const parseResult = options.schema.safeParse(rawData);
      if (!parseResult.success) {
        throw new AIError(
          `AI response does not match schema: ${parseResult.error.message}`,
          'PARSE_ERROR',
          'openai',
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
