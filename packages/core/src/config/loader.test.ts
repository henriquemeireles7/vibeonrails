import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  getConfig,
  setConfig,
  resetConfig,
} from './loader.js';
import { defineConfig } from './schema.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'vor-config-test-'));
  resetConfig();
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  resetConfig();
});

describe('Config Loader', () => {
  it('should return defaults when no config file exists', async () => {
    const config = await loadConfig(tempDir);
    expect(config.name).toBe('my-vibe-app');
    expect(config.port).toBe(3000);
  });

  it('should load from JSON file', async () => {
    await writeFile(
      join(tempDir, 'vibe.config.json'),
      JSON.stringify({ name: 'test-from-json', port: 4000 }),
    );

    const config = await loadConfig(tempDir);
    expect(config.name).toBe('test-from-json');
    expect(config.port).toBe(4000);
  });

  it('should cache config', async () => {
    await loadConfig(tempDir);
    const config1 = getConfig();
    const config2 = getConfig();
    expect(config1).toBe(config2);
  });

  it('should allow direct config setting (for tests)', () => {
    const config = defineConfig({ name: 'direct-set' });
    setConfig(config);
    expect(getConfig().name).toBe('direct-set');
  });

  it('should reset config cache', () => {
    setConfig(defineConfig({ name: 'cached' }));
    resetConfig();
    // After reset, getConfig returns defaults
    expect(getConfig().name).toBe('my-vibe-app');
  });

  it('should merge defaults for partial JSON config', async () => {
    await writeFile(
      join(tempDir, 'vibe.config.json'),
      JSON.stringify({
        name: 'partial-config',
        modules: { marketing: true },
      }),
    );

    const config = await loadConfig(tempDir);
    expect(config.name).toBe('partial-config');
    expect(config.modules.marketing).toBe(true);
    expect(config.modules.sales).toBe(false); // default
    expect(config.security.csrf.enabled).toBe(true); // default
  });
});
