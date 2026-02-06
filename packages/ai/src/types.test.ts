import { describe, it, expect } from 'vitest';
import {
  AIConfigSchema,
  ChatMessageSchema,
  ChatRoleSchema,
  AI_CAPABILITIES,
  AI_PROVIDERS,
  AI_ERROR_CODES,
  AIError,
  DEFAULT_RETRY_CONFIG,
} from './types.js';

describe('AI SDK Types', () => {
  describe('ChatRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(ChatRoleSchema.parse('system')).toBe('system');
      expect(ChatRoleSchema.parse('user')).toBe('user');
      expect(ChatRoleSchema.parse('assistant')).toBe('assistant');
    });

    it('should reject invalid roles', () => {
      expect(() => ChatRoleSchema.parse('admin')).toThrow();
      expect(() => ChatRoleSchema.parse('')).toThrow();
      expect(() => ChatRoleSchema.parse(123)).toThrow();
    });
  });

  describe('ChatMessageSchema', () => {
    it('should accept valid messages', () => {
      const result = ChatMessageSchema.parse({
        role: 'user',
        content: 'Hello, world!',
      });
      expect(result.role).toBe('user');
      expect(result.content).toBe('Hello, world!');
    });

    it('should accept system messages', () => {
      const result = ChatMessageSchema.parse({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
      expect(result.role).toBe('system');
      expect(result.content).toBe('You are a helpful assistant.');
    });

    it('should reject messages with missing fields', () => {
      expect(() => ChatMessageSchema.parse({ role: 'user' })).toThrow();
      expect(() => ChatMessageSchema.parse({ content: 'hi' })).toThrow();
      expect(() => ChatMessageSchema.parse({})).toThrow();
    });

    it('should reject messages with invalid role', () => {
      expect(() =>
        ChatMessageSchema.parse({ role: 'invalid', content: 'hi' }),
      ).toThrow();
    });
  });

  describe('AIConfigSchema', () => {
    it('should accept valid config with required fields', () => {
      const result = AIConfigSchema.parse({
        provider: 'anthropic',
        apiKey: 'sk-test-key-123',
      });
      expect(result.provider).toBe('anthropic');
      expect(result.apiKey).toBe('sk-test-key-123');
      expect(result.maxRetries).toBe(3);
      expect(result.timeout).toBe(30000);
    });

    it('should accept valid config with all fields', () => {
      const result = AIConfigSchema.parse({
        provider: 'openai',
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4',
        maxRetries: 5,
        timeout: 60000,
      });
      expect(result.provider).toBe('openai');
      expect(result.baseUrl).toBe('https://api.openai.com/v1');
      expect(result.defaultModel).toBe('gpt-4');
      expect(result.maxRetries).toBe(5);
      expect(result.timeout).toBe(60000);
    });

    it('should accept ollama provider', () => {
      const result = AIConfigSchema.parse({
        provider: 'ollama',
        apiKey: 'ollama',
        baseUrl: 'http://localhost:11434',
      });
      expect(result.provider).toBe('ollama');
    });

    it('should reject empty api key', () => {
      expect(() =>
        AIConfigSchema.parse({ provider: 'anthropic', apiKey: '' }),
      ).toThrow();
    });

    it('should reject invalid provider', () => {
      expect(() =>
        AIConfigSchema.parse({ provider: 'invalid', apiKey: 'key' }),
      ).toThrow();
    });

    it('should reject invalid baseUrl', () => {
      expect(() =>
        AIConfigSchema.parse({
          provider: 'anthropic',
          apiKey: 'key',
          baseUrl: 'not-a-url',
        }),
      ).toThrow();
    });

    it('should reject maxRetries out of range', () => {
      expect(() =>
        AIConfigSchema.parse({
          provider: 'anthropic',
          apiKey: 'key',
          maxRetries: -1,
        }),
      ).toThrow();
      expect(() =>
        AIConfigSchema.parse({
          provider: 'anthropic',
          apiKey: 'key',
          maxRetries: 11,
        }),
      ).toThrow();
    });

    it('should reject timeout out of range', () => {
      expect(() =>
        AIConfigSchema.parse({
          provider: 'anthropic',
          apiKey: 'key',
          timeout: 500,
        }),
      ).toThrow();
      expect(() =>
        AIConfigSchema.parse({
          provider: 'anthropic',
          apiKey: 'key',
          timeout: 500000,
        }),
      ).toThrow();
    });

    it('should apply defaults for optional fields', () => {
      const result = AIConfigSchema.parse({
        provider: 'anthropic',
        apiKey: 'key',
      });
      expect(result.maxRetries).toBe(3);
      expect(result.timeout).toBe(30000);
      expect(result.baseUrl).toBeUndefined();
      expect(result.defaultModel).toBeUndefined();
    });
  });

  describe('AI_CAPABILITIES', () => {
    it('should contain all expected capabilities', () => {
      expect(AI_CAPABILITIES).toContain('vision');
      expect(AI_CAPABILITIES).toContain('toolUse');
      expect(AI_CAPABILITIES).toContain('streaming');
      expect(AI_CAPABILITIES).toContain('structuredOutput');
      expect(AI_CAPABILITIES).toContain('systemPrompt');
      expect(AI_CAPABILITIES).toHaveLength(5);
    });
  });

  describe('AI_PROVIDERS', () => {
    it('should contain all expected providers', () => {
      expect(AI_PROVIDERS).toContain('anthropic');
      expect(AI_PROVIDERS).toContain('openai');
      expect(AI_PROVIDERS).toContain('ollama');
      expect(AI_PROVIDERS).toHaveLength(3);
    });
  });

  describe('AI_ERROR_CODES', () => {
    it('should contain all expected error codes', () => {
      expect(AI_ERROR_CODES).toContain('AUTH_ERROR');
      expect(AI_ERROR_CODES).toContain('RATE_LIMIT');
      expect(AI_ERROR_CODES).toContain('INVALID_REQUEST');
      expect(AI_ERROR_CODES).toContain('MODEL_NOT_FOUND');
      expect(AI_ERROR_CODES).toContain('CONTEXT_LENGTH_EXCEEDED');
      expect(AI_ERROR_CODES).toContain('PROVIDER_ERROR');
      expect(AI_ERROR_CODES).toContain('NETWORK_ERROR');
      expect(AI_ERROR_CODES).toContain('TIMEOUT');
      expect(AI_ERROR_CODES).toContain('PARSE_ERROR');
      expect(AI_ERROR_CODES).toContain('CAPABILITY_NOT_SUPPORTED');
      expect(AI_ERROR_CODES).toHaveLength(10);
    });
  });

  describe('AIError', () => {
    it('should create error with all fields', () => {
      const error = new AIError(
        'API key is invalid',
        'AUTH_ERROR',
        'anthropic',
      );
      expect(error.message).toBe('API key is invalid');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.provider).toBe('anthropic');
      expect(error.name).toBe('AIError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new AIError(
        'Network failure',
        'NETWORK_ERROR',
        'openai',
        cause,
      );
      expect(error.cause).toBe(cause);
      expect(error.provider).toBe('openai');
    });

    it('should be instanceof Error', () => {
      const error = new AIError('test', 'PROVIDER_ERROR', 'ollama');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIError);
    });
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(10000);
    });
  });
});
