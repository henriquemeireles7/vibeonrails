import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getConnectionStatus,
  getAllConnectionStatuses,
  formatConnectionStatus,
  type ConnectionStatusTokenStore,
  type ConnectionStatus,
} from './connections-status.js';

describe('Connection Status', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Mock store
  // -----------------------------------------------------------------------

  function createMockStore(
    tokens: Record<string, { provider: string; expiresAt?: string; lastRefreshedAt?: string; scopes: string[] }>,
  ): ConnectionStatusTokenStore {
    return {
      list: vi.fn().mockResolvedValue(Object.keys(tokens)),
      get: vi.fn().mockImplementation(async (provider: string) => {
        return tokens[provider] ?? null;
      }),
    };
  }

  // -----------------------------------------------------------------------
  // getConnectionStatus
  // -----------------------------------------------------------------------

  describe('getConnectionStatus', () => {
    it('should return connected status for valid token', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour
      const store = createMockStore({
        twitter: {
          provider: 'twitter',
          expiresAt: futureDate,
          lastRefreshedAt: new Date().toISOString(),
          scopes: ['read', 'write'],
        },
      });

      const status = await getConnectionStatus(store, 'twitter');

      expect(status.provider).toBe('twitter');
      expect(status.connected).toBe(true);
      expect(status.isExpired).toBe(false);
      expect(status.scopes).toEqual(['read', 'write']);
      expect(status.error).toBeNull();
    });

    it('should detect expired token', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const store = createMockStore({
        github: {
          provider: 'github',
          expiresAt: pastDate,
          scopes: ['repo'],
        },
      });

      const status = await getConnectionStatus(store, 'github');

      expect(status.connected).toBe(false);
      expect(status.isExpired).toBe(true);
      expect(status.error).toBe('Token expired');
    });

    it('should handle missing token', async () => {
      const store = createMockStore({});

      const status = await getConnectionStatus(store, 'unknown');

      expect(status.connected).toBe(false);
      expect(status.error).toBe('No token stored');
    });

    it('should handle token without expiry', async () => {
      const store = createMockStore({
        api: {
          provider: 'api',
          scopes: ['all'],
        },
      });

      const status = await getConnectionStatus(store, 'api');

      expect(status.connected).toBe(true);
      expect(status.expiresAt).toBeNull();
      expect(status.isExpired).toBe(false);
    });

    it('should handle store errors gracefully', async () => {
      const store: ConnectionStatusTokenStore = {
        list: vi.fn().mockResolvedValue(['broken']),
        get: vi.fn().mockRejectedValue(new Error('Decryption failed')),
      };

      const status = await getConnectionStatus(store, 'broken');

      expect(status.connected).toBe(false);
      expect(status.error).toBe('Decryption failed');
    });
  });

  // -----------------------------------------------------------------------
  // getAllConnectionStatuses
  // -----------------------------------------------------------------------

  describe('getAllConnectionStatuses', () => {
    it('should return status for all providers', async () => {
      const future = new Date(Date.now() + 3600000).toISOString();
      const store = createMockStore({
        twitter: { provider: 'twitter', expiresAt: future, scopes: ['read'] },
        github: { provider: 'github', expiresAt: future, scopes: ['repo'] },
      });

      const statuses = await getAllConnectionStatuses(store);

      expect(statuses).toHaveLength(2);
      expect(statuses.map((s) => s.provider).sort()).toEqual(['github', 'twitter']);
    });

    it('should return empty array when no connections', async () => {
      const store = createMockStore({});

      const statuses = await getAllConnectionStatuses(store);

      expect(statuses).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // formatConnectionStatus
  // -----------------------------------------------------------------------

  describe('formatConnectionStatus', () => {
    it('should format connected status', () => {
      const status: ConnectionStatus = {
        provider: 'twitter',
        connected: true,
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24h
        isExpired: false,
        lastRefreshedAt: new Date().toISOString(),
        scopes: ['read', 'write'],
        error: null,
      };

      const output = formatConnectionStatus(status);

      expect(output).toContain('twitter');
      expect(output).toContain('Scopes');
      expect(output).toContain('read');
      expect(output).toContain('Last refresh');
    });

    it('should format expired status with warning', () => {
      const status: ConnectionStatus = {
        provider: 'github',
        connected: false,
        expiresAt: new Date(Date.now() - 7200000).toISOString(), // 2h ago
        isExpired: true,
        lastRefreshedAt: null,
        scopes: [],
        error: 'Token expired',
      };

      const output = formatConnectionStatus(status);

      expect(output).toContain('github');
      expect(output).toContain('expired');
    });

    it('should format status with error', () => {
      const status: ConnectionStatus = {
        provider: 'discord',
        connected: false,
        expiresAt: null,
        isExpired: false,
        lastRefreshedAt: null,
        scopes: [],
        error: 'Decryption failed',
      };

      const output = formatConnectionStatus(status);

      expect(output).toContain('discord');
      expect(output).toContain('Error');
      expect(output).toContain('Decryption failed');
    });

    it('should format status without expiry', () => {
      const status: ConnectionStatus = {
        provider: 'api',
        connected: true,
        expiresAt: null,
        isExpired: false,
        lastRefreshedAt: null,
        scopes: ['all'],
        error: null,
      };

      const output = formatConnectionStatus(status);

      expect(output).toContain('api');
      expect(output).toContain('no expiry');
    });
  });
});
