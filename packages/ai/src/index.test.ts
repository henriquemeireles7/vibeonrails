import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAI, detectProviderFromEnv, AIError } from './index.js';

describe('AI SDK Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    // Clear all AI-related env vars
    delete process.env.AI_PROVIDER;
    delete process.env.AI_MODEL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OLLAMA_HOST;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectProviderFromEnv', () => {
    it('should detect Anthropic from ANTHROPIC_API_KEY', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const config = detectProviderFromEnv();
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('anthropic');
      expect(config?.apiKey).toBe('sk-ant-test');
    });

    it('should detect OpenAI from OPENAI_API_KEY', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';

      const config = detectProviderFromEnv();
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('openai');
      expect(config?.apiKey).toBe('sk-openai-test');
    });

    it('should detect OpenAI with custom base URL', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';
      process.env.OPENAI_BASE_URL = 'https://custom.api.com/v1';

      const config = detectProviderFromEnv();
      expect(config?.baseUrl).toBe('https://custom.api.com/v1');
    });

    it('should detect Ollama from OLLAMA_HOST', () => {
      process.env.OLLAMA_HOST = 'http://localhost:11434';

      const config = detectProviderFromEnv();
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('ollama');
      expect(config?.apiKey).toBe('http://localhost:11434');
    });

    it('should prefer explicit AI_PROVIDER over auto-detection', () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-openai';
      process.env.ANTHROPIC_API_KEY = 'sk-ant';

      const config = detectProviderFromEnv();
      expect(config?.provider).toBe('openai');
    });

    it('should return null when explicit AI_PROVIDER has no matching key', () => {
      process.env.AI_PROVIDER = 'openai';
      // No OPENAI_API_KEY set

      const config = detectProviderFromEnv();
      expect(config).toBeNull();
    });

    it('should return null when no env vars are set', () => {
      const config = detectProviderFromEnv();
      expect(config).toBeNull();
    });

    it('should include AI_MODEL when set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.AI_MODEL = 'claude-3-haiku-20240307';

      const config = detectProviderFromEnv();
      expect(config?.defaultModel).toBe('claude-3-haiku-20240307');
    });

    it('should prioritize Anthropic over OpenAI when both are set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant';
      process.env.OPENAI_API_KEY = 'sk-openai';

      const config = detectProviderFromEnv();
      expect(config?.provider).toBe('anthropic');
    });
  });

  describe('createAI', () => {
    it('should create Anthropic provider with explicit config', () => {
      const provider = createAI({
        provider: 'anthropic',
        apiKey: 'sk-test-key',
      });

      expect(provider.name).toBe('anthropic');
      expect(provider.supports('vision')).toBe(true);
    });

    it('should create OpenAI provider with explicit config', () => {
      const provider = createAI({
        provider: 'openai',
        apiKey: 'sk-test-key',
      });

      expect(provider.name).toBe('openai');
    });

    it('should create Ollama provider with explicit config', () => {
      const provider = createAI({
        provider: 'ollama',
        apiKey: 'ollama',
        baseUrl: 'http://localhost:11434',
      });

      expect(provider.name).toBe('ollama');
      expect(provider.supports('vision')).toBe(false);
    });

    it('should auto-detect provider from env vars', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const provider = createAI();
      expect(provider.name).toBe('anthropic');
    });

    it('should throw when no config and no env vars', () => {
      expect(() => createAI()).toThrow(AIError);
      expect(() => createAI()).toThrow(
        /No AI provider configured/,
      );
    });

    it('should throw on invalid config', () => {
      expect(() =>
        createAI({
          provider: 'anthropic',
          apiKey: '',
        }),
      ).toThrow();
    });

    it('should merge partial config with env detection', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const provider = createAI({ maxRetries: 5 });
      expect(provider.name).toBe('anthropic');
    });
  });
});
