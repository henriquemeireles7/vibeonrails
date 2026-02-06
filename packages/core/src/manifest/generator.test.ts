import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateManifest, writeManifest } from './generator.js';
import { defineConfig } from '../config/schema.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'vor-manifest-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('Project Manifest Generator', () => {
  it('should generate manifest with default config', async () => {
    const config = defineConfig({});
    const manifest = await generateManifest(config, tempDir);

    expect(manifest.version).toBe(1);
    expect(manifest.name).toBe('my-vibe-app');
    expect(manifest.modules.marketing).toBe(false);
    expect(manifest.commands).toContain('vibe dev');
    expect(manifest.generatedAt).toBeTruthy();
  });

  it('should include module-specific commands when modules enabled', async () => {
    const config = defineConfig({
      modules: { marketing: true, finance: true },
    });
    const manifest = await generateManifest(config, tempDir);

    expect(manifest.commands).toContain(
      'vibe marketing generate <channel>',
    );
    expect(manifest.commands).toContain('vibe finance mrr');
  });

  it('should not include module commands when modules disabled', async () => {
    const config = defineConfig({});
    const manifest = await generateManifest(config, tempDir);

    expect(manifest.commands).not.toContain(
      'vibe marketing generate <channel>',
    );
  });

  it('should count content files', async () => {
    // Create content directory with some files
    const contentDir = join(tempDir, 'content', 'blog');
    await mkdir(contentDir, { recursive: true });
    await writeFile(join(contentDir, 'post1.md'), '# Post 1');
    await writeFile(join(contentDir, 'post2.md'), '# Post 2');

    const config = defineConfig({});
    const manifest = await generateManifest(config, tempDir);

    expect(manifest.contentCounts.blog).toBe(2);
  });

  it('should scan routes from modules directory', async () => {
    const modulesDir = join(tempDir, 'src', 'modules', 'order');
    await mkdir(modulesDir, { recursive: true });
    await writeFile(
      join(modulesDir, 'order.controller.ts'),
      'export const orderRouter = {};',
    );

    const config = defineConfig({});
    const manifest = await generateManifest(config, tempDir);

    expect(manifest.routes).toContain('/api/order');
  });

  it('should detect connections from credentials file', async () => {
    const vibeDir = join(tempDir, '.vibe');
    await mkdir(vibeDir, { recursive: true });
    await writeFile(
      join(vibeDir, 'credentials.json'),
      JSON.stringify({
        version: 1,
        tokens: { twitter: 'encrypted...', bluesky: 'encrypted...' },
      }),
    );

    const config = defineConfig({});
    const manifest = await generateManifest(config, tempDir);

    expect(manifest.connections).toContain('twitter');
    expect(manifest.connections).toContain('bluesky');
  });

  it('should detect enabled sites', async () => {
    const config = defineConfig({
      sites: {
        blog: { enabled: true },
        help: { enabled: true },
      },
    });
    const manifest = await generateManifest(config, tempDir);

    expect(manifest.config.enabledSites).toContain('blog');
    expect(manifest.config.enabledSites).toContain('help');
    expect(manifest.config.enabledSites).not.toContain('changelog');
  });

  it('should write manifest to .vibe/project.json', async () => {
    const config = defineConfig({ name: 'write-test' });
    await writeManifest(config, tempDir);

    const content = await readFile(
      join(tempDir, '.vibe', 'project.json'),
      'utf-8',
    );
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe('write-test');
    expect(parsed.version).toBe(1);
  });
});
