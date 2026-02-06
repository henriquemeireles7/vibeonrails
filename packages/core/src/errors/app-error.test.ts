import { describe, it, expect, vi, afterEach } from 'vitest';
import { CatalogError } from './app-error.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('CatalogError', () => {
  it('should create error from catalog code', () => {
    const error = new CatalogError('VOR_AUTH_001');
    expect(error.code).toBe('VOR_AUTH_001');
    expect(error.message).toBe('Invalid credentials');
    expect(error.statusCode).toBe(401);
    expect(error.autoFixable).toBe(false);
    expect(error.docsUrl).toContain('VOR_AUTH_001');
  });

  it('should interpolate params in message', () => {
    const error = new CatalogError('VOR_ENV_001', {
      name: 'DATABASE_URL',
      hint: 'Get one at neon.tech',
    });
    expect(error.message).toContain('DATABASE_URL');
  });

  it('should interpolate params in fix', () => {
    const error = new CatalogError('VOR_MODULE_001', {
      module: 'marketing',
    });
    expect(error.fix).toContain('vibe add marketing');
  });

  it('should handle unknown error code', () => {
    const error = new CatalogError('VOR_UNKNOWN_999');
    expect(error.code).toBe('VOR_UNKNOWN_999');
    expect(error.message).toContain('Unknown error code');
    expect(error.statusCode).toBe(500);
  });

  it('should include cause', () => {
    const cause = new Error('original error');
    const error = new CatalogError('VOR_DB_001', {}, { cause });
    expect(error.cause).toBe(cause);
  });

  describe('toJSON', () => {
    it('should output structured JSON', () => {
      const error = new CatalogError('VOR_AUTH_002');
      const json = error.toJSON();
      expect(json.error).toBeDefined();
      const e = json.error as Record<string, unknown>;
      expect(e.code).toBe('VOR_AUTH_002');
      expect(e.autoFixable).toBe(true);
      expect(e.docsUrl).toContain('VOR_AUTH_002');
    });
  });

  describe('format', () => {
    it('should format as human-readable by default', () => {
      const error = new CatalogError('VOR_AUTH_001');
      const formatted = error.format();
      expect(formatted).toContain('Error [VOR_AUTH_001]');
      expect(formatted).toContain('Fix:');
      expect(formatted).toContain('Docs:');
    });

    it('should format as JSON when VIBE_OUTPUT=json', () => {
      vi.stubEnv('VIBE_OUTPUT', 'json');
      const error = new CatalogError('VOR_AUTH_001');
      const formatted = error.format();
      const parsed = JSON.parse(formatted);
      expect(parsed.error.code).toBe('VOR_AUTH_001');
    });

    it('should format as CI output when VIBE_OUTPUT=ci', () => {
      vi.stubEnv('VIBE_OUTPUT', 'ci');
      const error = new CatalogError('VOR_AUTH_001');
      const formatted = error.format();
      expect(formatted).toMatch(/^\[VOR_AUTH_001\]/);
      expect(formatted).toContain('Fix:');
    });

    it('should show auto-fixable hint in human mode', () => {
      const error = new CatalogError('VOR_AUTH_002');
      expect(error.autoFixable).toBe(true);
      const formatted = error.format();
      expect(formatted).toContain('auto-fixable: yes');
    });
  });
});
