import { describe, it, expect } from 'vitest';
import { defineConfig, getDefaultConfig, VibeConfigSchema } from './schema.js';

describe('VibeConfig Schema', () => {
  it('should provide sensible defaults', () => {
    const config = getDefaultConfig();
    expect(config.name).toBe('my-vibe-app');
    expect(config.port).toBe(3000);
    expect(config.env).toBe('development');
    expect(config.security.csrf.enabled).toBe(true);
    expect(config.security.rateLimit.auth.max).toBe(5);
    expect(config.security.rateLimit.api.max).toBe(100);
    expect(config.analytics.server).toBe(true);
    expect(config.analytics.client).toBe(false);
    expect(config.sites.mode).toBe('path');
  });

  it('should accept partial config', () => {
    const config = defineConfig({ name: 'test-app' });
    expect(config.name).toBe('test-app');
    expect(config.port).toBe(3000); // default preserved
  });

  it('should allow nested partial overrides', () => {
    const config = defineConfig({
      security: {
        cors: { origins: ['https://example.com'] },
      },
    });
    expect(config.security.cors.origins).toEqual([
      'https://example.com',
    ]);
    expect(config.security.csrf.enabled).toBe(true); // default preserved
  });

  it('should validate port as positive integer', () => {
    expect(() => defineConfig({ port: -1 })).toThrow();
    expect(() => defineConfig({ port: 0 })).toThrow();
    expect(() => defineConfig({ port: 1.5 })).toThrow();
  });

  it('should validate env enum', () => {
    expect(
      defineConfig({ env: 'production' }).env,
    ).toBe('production');
    expect(() =>
      VibeConfigSchema.parse({ env: 'invalid' }),
    ).toThrow();
  });

  it('should accept module configuration', () => {
    const config = defineConfig({
      modules: {
        marketing: true,
        sales: true,
      },
    });
    expect(config.modules.marketing).toBe(true);
    expect(config.modules.sales).toBe(true);
    expect(config.modules.finance).toBe(false); // default
  });

  it('should accept feature flags', () => {
    const config = defineConfig({
      flags: {
        'dark-mode': true,
        'new-checkout': false,
      },
    });
    expect(config.flags['dark-mode']).toBe(true);
    expect(config.flags['new-checkout']).toBe(false);
  });

  it('should accept sites configuration', () => {
    const config = defineConfig({
      sites: {
        blog: { enabled: true },
        help: { enabled: true, path: '/support' },
      },
    });
    expect(config.sites.blog.enabled).toBe(true);
    expect(config.sites.help.enabled).toBe(true);
    expect(config.sites.help.path).toBe('/support');
    expect(config.sites.changelog.enabled).toBe(false); // default
  });
});
