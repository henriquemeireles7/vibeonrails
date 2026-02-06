import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFileTokenStore } from './store.js';
import type { OAuthToken, TokenRefreshConfig } from './types.js';

const TEST_JWT_SECRET =
  'a-very-long-secret-that-is-at-least-32-chars-long-for-testing';

let tempDir: string;

function createTestToken(overrides?: Partial<OAuthToken>): OAuthToken {
  return {
    provider: 'twitter',
    accessToken: 'test-access-token-12345',
    refreshToken: 'test-refresh-token-67890',
    tokenType: 'Bearer',
    expiresAt: '2026-12-31T23:59:59.000Z',
    scopes: ['read', 'write'],
    storedAt: '2026-02-06T12:00:00.000Z',
    metadata: {},
    ...overrides,
  };
}

function createStore(projectRoot?: string) {
  return createFileTokenStore({
    jwtSecret: TEST_JWT_SECRET,
    projectRoot: projectRoot ?? tempDir,
  });
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'vor-oauth-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('FileTokenStore', () => {
  describe('set and get', () => {
    it('should store and retrieve a token', async () => {
      const store = createStore();
      const token = createTestToken();

      await store.set('twitter', token);
      const retrieved = await store.get('twitter');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.provider).toBe('twitter');
      expect(retrieved!.accessToken).toBe('test-access-token-12345');
      expect(retrieved!.refreshToken).toBe('test-refresh-token-67890');
    });

    it('should return null for non-existent provider', async () => {
      const store = createStore();
      const result = await store.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should overwrite existing token', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken());
      await store.set(
        'twitter',
        createTestToken({ accessToken: 'new-token' }),
      );

      const retrieved = await store.get('twitter');
      expect(retrieved!.accessToken).toBe('new-token');
    });

    it('should store multiple providers', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken({ provider: 'twitter' }));
      await store.set(
        'bluesky',
        createTestToken({ provider: 'bluesky', accessToken: 'bsky-token' }),
      );

      const twitter = await store.get('twitter');
      const bluesky = await store.get('bluesky');

      expect(twitter!.provider).toBe('twitter');
      expect(bluesky!.provider).toBe('bluesky');
      expect(bluesky!.accessToken).toBe('bsky-token');
    });
  });

  describe('remove', () => {
    it('should remove an existing token', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken());
      const removed = await store.remove('twitter');

      expect(removed).toBe(true);
      expect(await store.get('twitter')).toBeNull();
    });

    it('should return false for non-existent provider', async () => {
      const store = createStore();
      const removed = await store.remove('nonexistent');
      expect(removed).toBe(false);
    });

    it('should not affect other providers', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken({ provider: 'twitter' }));
      await store.set('bluesky', createTestToken({ provider: 'bluesky' }));

      await store.remove('twitter');

      expect(await store.get('twitter')).toBeNull();
      expect(await store.get('bluesky')).not.toBeNull();
    });
  });

  describe('list', () => {
    it('should return empty array when no tokens', async () => {
      const store = createStore();
      expect(await store.list()).toEqual([]);
    });

    it('should return all provider names', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken({ provider: 'twitter' }));
      await store.set('bluesky', createTestToken({ provider: 'bluesky' }));

      const list = await store.list();
      expect(list).toContain('twitter');
      expect(list).toContain('bluesky');
      expect(list).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('should return true for existing provider', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken());
      expect(await store.has('twitter')).toBe(true);
    });

    it('should return false for non-existent provider', async () => {
      const store = createStore();
      expect(await store.has('twitter')).toBe(false);
    });
  });

  describe('refresh config', () => {
    it('should store and retrieve refresh config', async () => {
      const store = createStore();
      const config: TokenRefreshConfig = {
        refreshUrl: 'https://api.twitter.com/2/oauth2/token',
        method: 'POST',
        headers: {},
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshBeforeExpiry: 300,
        maxRetries: 3,
      };

      await store.setRefreshConfig('twitter', config);
      const retrieved = await store.getRefreshConfig('twitter');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.refreshUrl).toBe(
        'https://api.twitter.com/2/oauth2/token',
      );
      expect(retrieved!.clientId).toBe('test-client-id');
    });

    it('should return null for non-existent refresh config', async () => {
      const store = createStore();
      const config = await store.getRefreshConfig('nonexistent');
      expect(config).toBeNull();
    });
  });

  describe('file persistence', () => {
    it('should create .vibe directory if missing', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken());

      const fileContent = await readFile(
        join(tempDir, '.vibe/credentials.json'),
        'utf-8',
      );
      const parsed = JSON.parse(fileContent);
      expect(parsed.version).toBe(1);
      expect(parsed.tokens.twitter).toBeDefined();
    });

    it('should persist across store instances', async () => {
      const store1 = createStore();
      await store1.set('twitter', createTestToken());

      const store2 = createStore();
      const retrieved = await store2.get('twitter');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.accessToken).toBe('test-access-token-12345');
    });

    it('should handle corrupted file gracefully', async () => {
      const store = createStore();
      // Write garbage to the file
      const { mkdir: mkdirSync, writeFile: writeFileSync } = await import(
        'node:fs/promises'
      );
      await mkdirSync(join(tempDir, '.vibe'), { recursive: true });
      await writeFileSync(
        join(tempDir, '.vibe/credentials.json'),
        'not-json',
        'utf-8',
      );

      // Should return empty instead of crashing
      const list = await store.list();
      expect(list).toEqual([]);
    });
  });

  describe('getTokenStatus', () => {
    it('should return status for existing token', async () => {
      const store = createStore();
      await store.set('twitter', createTestToken());
      const status = await store.getTokenStatus('twitter');

      expect(status.provider).toBe('twitter');
      expect(status.hasToken).toBe(true);
      expect(status.expiresAt).toBe('2026-12-31T23:59:59.000Z');
      expect(status.isExpired).toBe(false);
      expect(status.scopes).toEqual(['read', 'write']);
    });

    it('should show expired status for past expiry', async () => {
      const store = createStore();
      await store.set(
        'twitter',
        createTestToken({ expiresAt: '2020-01-01T00:00:00.000Z' }),
      );
      const status = await store.getTokenStatus('twitter');

      expect(status.isExpired).toBe(true);
    });

    it('should return not-found status for missing provider', async () => {
      const store = createStore();
      const status = await store.getTokenStatus('nonexistent');

      expect(status.hasToken).toBe(false);
      expect(status.expiresAt).toBeNull();
      expect(status.isExpired).toBe(false);
    });
  });
});
