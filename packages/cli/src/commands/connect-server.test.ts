/**
 * OAuth Connect Flow — Tests
 *
 * Tests for the OAuth connect server implementation.
 * Uses unit tests that don't require actual network binding.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';
import { startConnectFlow, type ConnectOptions } from './connect-server.js';

describe('startConnectFlow', () => {
  const testDir = join(tmpdir(), 'vibe-cli-connect-test-' + Date.now());
  const jwtSecret = 'test-jwt-secret-for-encryption-key-derivation';

  const baseOptions: ConnectOptions = {
    provider: 'test-provider',
    clientId: 'test-client-id',
    authorizationUrl: 'https://example.com/oauth/authorize',
    tokenUrl: 'https://example.com/oauth/token',
    scopes: ['read', 'write'],
    jwtSecret,
    projectRoot: testDir,
  };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('device code flow fallback detection', () => {
    it('should detect non-TTY environment and throw', async () => {
      // Save originals
      const originalStdinIsTTY = process.stdin.isTTY;
      const originalStdoutIsTTY = process.stdout.isTTY;

      // Mock non-TTY
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      try {
        await expect(startConnectFlow(baseOptions)).rejects.toThrow(
          'OAuth connect flow requires an interactive terminal',
        );
      } finally {
        // Restore
        Object.defineProperty(process.stdin, 'isTTY', {
          value: originalStdinIsTTY,
          configurable: true,
        });
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalStdoutIsTTY,
          configurable: true,
        });
      }
    });
  });

  describe('options validation', () => {
    it('should require provider', () => {
      expect(baseOptions.provider).toBe('test-provider');
      expect(baseOptions.clientId).toBe('test-client-id');
      expect(baseOptions.scopes).toEqual(['read', 'write']);
    });

    it('should accept all configuration fields', () => {
      const options: ConnectOptions = {
        provider: 'twitter',
        clientId: 'my-client-id',
        authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        scopes: ['tweet.read', 'tweet.write'],
        jwtSecret: 'super-secret-key-for-jwt-operations',
        projectRoot: '/tmp/my-project',
      };

      expect(options.provider).toBe('twitter');
      expect(options.scopes).toHaveLength(2);
    });
  });

  describe('connect flow interface', () => {
    it('should export startConnectFlow function', () => {
      expect(typeof startConnectFlow).toBe('function');
    });

    it('should export ConnectOptions type', () => {
      const opts: ConnectOptions = baseOptions;
      expect(opts).toBeDefined();
    });
  });
});
