import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { createOpenAIProvider } from './openai.js';
import { type AIConfig } from '../types.js';

const mockConfig: AIConfig = {
  provider: 'openai',
  apiKey: 'sk-test-key',
  maxRetries: 0,
  timeout: 5000,
};

function mockFetchResponse(body: unknown, status = 200): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function mockFetchError(status: number, errorBody: unknown): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(errorBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('OpenAIProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('creation', () => {
    it('should create provider with correct name and capabilities', () => {
      const provider = createOpenAIProvider(mockConfig);
      expect(provider.name).toBe('openai');
      expect(provider.supports('vision')).toBe(true);
      expect(provider.supports('toolUse')).toBe(true);
      expect(provider.supports('streaming')).toBe(true);
      expect(provider.supports('structuredOutput')).toBe(true);
      expect(provider.supports('systemPrompt')).toBe(true);
    });
  });

  describe('chat (non-streaming)', () => {
    it('should send a chat request and return formatted response', async () => {
      const provider = createOpenAIProvider(mockConfig);

      mockFetchResponse({
        id: 'chatcmpl-123',
        choices: [
          {
            message: { role: 'assistant', content: 'Hello there!' },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      });

      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        stream: false,
      });

      expect(result).toEqual({
        content: 'Hello there!',
        model: 'gpt-4o',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key',
          }),
        }),
      );
    });

    it('should include system messages directly in messages array', async () => {
      const provider = createOpenAIProvider(mockConfig);

      mockFetchResponse({
        id: 'chatcmpl-123',
        choices: [
          {
            message: { role: 'assistant', content: 'I am helpful.' },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o',
        usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
      });

      await provider.chat({
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hi' },
        ],
        stream: false,
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      // OpenAI keeps system messages in the array
      expect(requestBody.messages).toEqual([
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hi' },
      ]);
    });

    it('should use custom base URL when provided', async () => {
      const customConfig: AIConfig = {
        ...mockConfig,
        baseUrl: 'https://custom-openai.example.com/v1',
      };
      const provider = createOpenAIProvider(customConfig);

      mockFetchResponse({
        id: 'chatcmpl-123',
        choices: [
          {
            message: { role: 'assistant', content: 'OK' },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o',
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        stream: false,
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://custom-openai.example.com/v1/chat/completions',
        expect.anything(),
      );
    });

    it('should map finish reasons correctly', async () => {
      const provider = createOpenAIProvider(mockConfig);

      mockFetchResponse({
        id: 'chatcmpl-123',
        choices: [
          {
            message: { role: 'assistant', content: '...' },
            finish_reason: 'length',
          },
        ],
        model: 'gpt-4o',
        usage: { prompt_tokens: 5, completion_tokens: 100, total_tokens: 105 },
      });

      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Write a novel' }],
        stream: false,
      });

      expect(result).toHaveProperty('finishReason', 'length');
    });
  });

  describe('chat error handling', () => {
    it('should throw AUTH_ERROR on 401', async () => {
      const provider = createOpenAIProvider(mockConfig);

      mockFetchError(401, {
        error: { message: 'Invalid API key' },
      });

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Hi' }],
          stream: false,
        }),
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        provider: 'openai',
      });
    });

    it('should throw RATE_LIMIT on 429', async () => {
      const provider = createOpenAIProvider(mockConfig);

      mockFetchError(429, {
        error: { message: 'Rate limit exceeded' },
      });

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Hi' }],
          stream: false,
        }),
      ).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        provider: 'openai',
      });
    });

    it('should throw CONTEXT_LENGTH_EXCEEDED on relevant 400', async () => {
      const provider = createOpenAIProvider(mockConfig);

      mockFetchError(400, {
        error: {
          message:
            "This model's maximum context length is 128000 tokens",
        },
      });

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'very long prompt...' }],
          stream: false,
        }),
      ).rejects.toMatchObject({
        code: 'CONTEXT_LENGTH_EXCEEDED',
        provider: 'openai',
      });
    });
  });

  describe('generateStructured', () => {
    it('should generate structured output with json_object response format', async () => {
      const provider = createOpenAIProvider(mockConfig);

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockFetchResponse({
        id: 'chatcmpl-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '{"name": "Bob", "age": 25}',
            },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o',
        usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 },
      });

      const result = await provider.generateStructured({
        prompt: 'Extract user info: Bob is 25',
        schema,
      });

      expect(result.data).toEqual({ name: 'Bob', age: 25 });
      expect(result.model).toBe('gpt-4o');

      // Should use json_object response format
      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      expect(requestBody.response_format).toEqual({ type: 'json_object' });
    });

    it('should throw PARSE_ERROR on invalid JSON', async () => {
      const provider = createOpenAIProvider(mockConfig);
      const schema = z.object({ name: z.string() });

      mockFetchResponse({
        id: 'chatcmpl-123',
        choices: [
          {
            message: { role: 'assistant', content: 'Not JSON' },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      await expect(
        provider.generateStructured({ prompt: 'Extract info', schema }),
      ).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        provider: 'openai',
      });
    });

    it('should throw PARSE_ERROR when JSON does not match schema', async () => {
      const provider = createOpenAIProvider(mockConfig);

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockFetchResponse({
        id: 'chatcmpl-123',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '{"name": "Bob", "age": "young"}',
            },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4o',
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      });

      await expect(
        provider.generateStructured({ prompt: 'Extract info', schema }),
      ).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        provider: 'openai',
      });
    });
  });
});
