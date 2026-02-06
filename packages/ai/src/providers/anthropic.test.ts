import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { createAnthropicProvider } from './anthropic.js';
import { type AIConfig, AIError } from '../types.js';

const mockConfig: AIConfig = {
  provider: 'anthropic',
  apiKey: 'test-api-key',
  maxRetries: 0, // No retries in tests for speed
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

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('creation', () => {
    it('should create provider with correct name and capabilities', () => {
      const provider = createAnthropicProvider(mockConfig);
      expect(provider.name).toBe('anthropic');
      expect(provider.supports('vision')).toBe(true);
      expect(provider.supports('toolUse')).toBe(true);
      expect(provider.supports('streaming')).toBe(true);
      expect(provider.supports('structuredOutput')).toBe(true);
      expect(provider.supports('systemPrompt')).toBe(true);
    });
  });

  describe('chat (non-streaming)', () => {
    it('should send a chat request and return formatted response', async () => {
      const provider = createAnthropicProvider(mockConfig);

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 8 },
      });

      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        stream: false,
      });

      expect(result).toEqual({
        content: 'Hello! How can I help?',
        model: 'claude-sonnet-4-20250514',
        usage: {
          promptTokens: 10,
          completionTokens: 8,
          totalTokens: 18,
        },
        finishReason: 'stop',
      });

      // Verify fetch was called with correct params
      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          }),
        }),
      );
    });

    it('should handle system messages by extracting to system parameter', async () => {
      const provider = createAnthropicProvider(mockConfig);

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'I am helpful.' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 15, output_tokens: 5 },
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

      // System message should NOT be in messages array
      expect(requestBody.messages).toEqual([
        { role: 'user', content: 'Hi' },
      ]);
      // System should be a separate parameter
      expect(requestBody.system).toBe('You are helpful.');
    });

    it('should use custom model when specified', async () => {
      const provider = createAnthropicProvider(mockConfig);

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'OK' }],
        model: 'claude-3-haiku-20240307',
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 1 },
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'claude-3-haiku-20240307',
        stream: false,
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      expect(requestBody.model).toBe('claude-3-haiku-20240307');
    });

    it('should map max_tokens finish reason correctly', async () => {
      const provider = createAnthropicProvider(mockConfig);

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'truncated...' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'max_tokens',
        usage: { input_tokens: 10, output_tokens: 100 },
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
      const provider = createAnthropicProvider(mockConfig);

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
        provider: 'anthropic',
      });
    });

    it('should throw RATE_LIMIT on 429', async () => {
      const provider = createAnthropicProvider(mockConfig);

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
        provider: 'anthropic',
      });
    });

    it('should throw MODEL_NOT_FOUND on 404', async () => {
      const provider = createAnthropicProvider(mockConfig);

      mockFetchError(404, {
        error: { message: 'Model not found' },
      });

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Hi' }],
          model: 'nonexistent-model',
          stream: false,
        }),
      ).rejects.toMatchObject({
        code: 'MODEL_NOT_FOUND',
        provider: 'anthropic',
      });
    });
  });

  describe('generateStructured', () => {
    it('should generate structured output and validate with Zod', async () => {
      const provider = createAnthropicProvider(mockConfig);

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: '{"name": "Alice", "age": 30}' },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 20, output_tokens: 15 },
      });

      const result = await provider.generateStructured({
        prompt: 'Extract user info from: Alice is 30 years old',
        schema,
      });

      expect(result.data).toEqual({ name: 'Alice', age: 30 });
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.usage.totalTokens).toBe(35);
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const provider = createAnthropicProvider(mockConfig);

      const schema = z.object({ color: z.string() });

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: '```json\n{"color": "blue"}\n```' },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 10 },
      });

      const result = await provider.generateStructured({
        prompt: 'What color is the sky?',
        schema,
      });

      expect(result.data).toEqual({ color: 'blue' });
    });

    it('should throw PARSE_ERROR on invalid JSON', async () => {
      const provider = createAnthropicProvider(mockConfig);

      const schema = z.object({ name: z.string() });

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'This is not JSON at all' },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 10 },
      });

      await expect(
        provider.generateStructured({
          prompt: 'Extract info',
          schema,
        }),
      ).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        provider: 'anthropic',
      });
    });

    it('should throw PARSE_ERROR when JSON does not match schema', async () => {
      const provider = createAnthropicProvider(mockConfig);

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockFetchResponse({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: '{"name": "Alice", "age": "thirty"}' },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 10 },
      });

      await expect(
        provider.generateStructured({
          prompt: 'Extract info',
          schema,
        }),
      ).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        provider: 'anthropic',
      });
    });
  });
});
