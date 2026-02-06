import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { createOllamaProvider } from './ollama.js';
import { type AIConfig } from '../types.js';

const mockConfig: AIConfig = {
  provider: 'ollama',
  apiKey: 'ollama',
  baseUrl: 'http://localhost:11434',
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

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('creation', () => {
    it('should create provider with correct name and reduced capabilities', () => {
      const provider = createOllamaProvider(mockConfig);
      expect(provider.name).toBe('ollama');
      expect(provider.supports('vision')).toBe(false);
      expect(provider.supports('toolUse')).toBe(false);
      expect(provider.supports('streaming')).toBe(true);
      expect(provider.supports('structuredOutput')).toBe(true);
      expect(provider.supports('systemPrompt')).toBe(true);
    });
  });

  describe('chat (non-streaming)', () => {
    it('should send a chat request and return formatted response', async () => {
      const provider = createOllamaProvider(mockConfig);

      mockFetchResponse({
        model: 'llama3.1',
        message: { role: 'assistant', content: 'Hello!' },
        done: true,
        prompt_eval_count: 10,
        eval_count: 5,
      });

      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        stream: false,
      });

      expect(result).toEqual({
        content: 'Hello!',
        model: 'llama3.1',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should handle missing token counts gracefully', async () => {
      const provider = createOllamaProvider(mockConfig);

      mockFetchResponse({
        model: 'llama3.1',
        message: { role: 'assistant', content: 'OK' },
        done: true,
        // No token counts
      });

      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        stream: false,
      });

      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it('should include system messages in messages array', async () => {
      const provider = createOllamaProvider(mockConfig);

      mockFetchResponse({
        model: 'llama3.1',
        message: { role: 'assistant', content: 'I help.' },
        done: true,
        prompt_eval_count: 15,
        eval_count: 3,
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
      expect(requestBody.messages).toEqual([
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hi' },
      ]);
    });
  });

  describe('chat error handling', () => {
    it('should throw MODEL_NOT_FOUND on 404', async () => {
      const provider = createOllamaProvider(mockConfig);

      mockFetchError(404, {
        error: 'model "nonexistent" not found',
      });

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Hi' }],
          model: 'nonexistent',
          stream: false,
        }),
      ).rejects.toMatchObject({
        code: 'MODEL_NOT_FOUND',
        provider: 'ollama',
      });
    });

    it('should throw NETWORK_ERROR when Ollama is not running', async () => {
      const provider = createOllamaProvider(mockConfig);

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('fetch failed'),
      );

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Hi' }],
          stream: false,
        }),
      ).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        provider: 'ollama',
      });
    });
  });

  describe('generateStructured', () => {
    it('should generate structured output with json format', async () => {
      const provider = createOllamaProvider(mockConfig);

      const schema = z.object({
        city: z.string(),
        population: z.number(),
      });

      mockFetchResponse({
        model: 'llama3.1',
        message: {
          role: 'assistant',
          content: '{"city": "Tokyo", "population": 14000000}',
        },
        done: true,
        prompt_eval_count: 20,
        eval_count: 15,
      });

      const result = await provider.generateStructured({
        prompt: 'What is the capital of Japan?',
        schema,
      });

      expect(result.data).toEqual({
        city: 'Tokyo',
        population: 14000000,
      });

      // Should request JSON format
      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      expect(requestBody.format).toBe('json');
    });

    it('should throw PARSE_ERROR on invalid JSON', async () => {
      const provider = createOllamaProvider(mockConfig);
      const schema = z.object({ name: z.string() });

      mockFetchResponse({
        model: 'llama3.1',
        message: { role: 'assistant', content: 'Not JSON' },
        done: true,
      });

      await expect(
        provider.generateStructured({ prompt: 'Extract info', schema }),
      ).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        provider: 'ollama',
      });
    });

    it('should throw PARSE_ERROR when JSON does not match schema', async () => {
      const provider = createOllamaProvider(mockConfig);

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockFetchResponse({
        model: 'llama3.1',
        message: {
          role: 'assistant',
          content: '{"name": "Alice"}',
        },
        done: true,
      });

      await expect(
        provider.generateStructured({ prompt: 'Extract info', schema }),
      ).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        provider: 'ollama',
      });
    });
  });
});
