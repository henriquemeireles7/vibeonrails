import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAPIKeyService,
  createInMemoryKeyStore,
  generateAPIKey,
  hashAPIKey,
  extractKeyPrefix,
  parseKeyEnvironment,
} from './service.js';
import type { APIKeyService, APIKeyStore } from './types.js';

describe('Key generation utilities', () => {
  it('should generate live key with correct prefix', () => {
    const key = generateAPIKey('live');
    expect(key).toMatch(/^vor_live_/);
    expect(key.length).toBeGreaterThan(20);
  });

  it('should generate test key with correct prefix', () => {
    const key = generateAPIKey('test');
    expect(key).toMatch(/^vor_test_/);
  });

  it('should generate unique keys', () => {
    const key1 = generateAPIKey('live');
    const key2 = generateAPIKey('live');
    expect(key1).not.toBe(key2);
  });

  it('should hash a key to hex string', () => {
    const hash = hashAPIKey('vor_live_test12345');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce deterministic hashes', () => {
    const hash1 = hashAPIKey('vor_live_test');
    const hash2 = hashAPIKey('vor_live_test');
    expect(hash1).toBe(hash2);
  });

  it('should extract key prefix', () => {
    const prefix = extractKeyPrefix('vor_live_abcdefghijklmn');
    expect(prefix).toBe('vor_live_abcd');
  });

  it('should parse live environment', () => {
    expect(parseKeyEnvironment('vor_live_xxx')).toBe('live');
  });

  it('should parse test environment', () => {
    expect(parseKeyEnvironment('vor_test_xxx')).toBe('test');
  });

  it('should return null for unknown prefix', () => {
    expect(parseKeyEnvironment('unknown_xxx')).toBeNull();
  });
});

describe('APIKeyService', () => {
  let store: APIKeyStore;
  let service: APIKeyService;

  beforeEach(() => {
    store = createInMemoryKeyStore();
    service = createAPIKeyService(store);
  });

  describe('create', () => {
    it('should create a key and return it once', async () => {
      const result = await service.create({
        name: 'My API Key',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      expect(result.key).toMatch(/^vor_live_/);
      expect(result.apiKey.name).toBe('My API Key');
      expect(result.apiKey.ownerId).toBe('user-1');
      expect(result.apiKey.usageCount).toBe(0);
      expect(result.apiKey.revokedAt).toBeNull();
    });

    it('should store hashed key, not plaintext', async () => {
      const result = await service.create({
        name: 'Test Key',
        environment: 'test',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      // The stored key should be a hash, not the original
      expect(result.apiKey.keyHash).not.toBe(result.key);
      expect(result.apiKey.keyHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('validate', () => {
    it('should validate a valid key', async () => {
      const { key } = await service.create({
        name: 'Valid Key',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      const result = await service.validate(key);
      expect(result.valid).toBe(true);
      expect(result.apiKey).toBeDefined();
    });

    it('should reject invalid key', async () => {
      const result = await service.validate('vor_live_invalid_key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid');
    });

    it('should reject key with bad prefix', async () => {
      const result = await service.validate('bad_prefix_key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid');
    });

    it('should reject revoked key', async () => {
      const { key, apiKey } = await service.create({
        name: 'Revoked Key',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      await service.revoke(apiKey.id);
      const result = await service.validate(key);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('revoked');
    });

    it('should reject expired key', async () => {
      const { key } = await service.create({
        name: 'Expired Key',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: new Date('2020-01-01'),
        scopes: [],
        metadata: {},
      });

      const result = await service.validate(key);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired');
    });
  });

  describe('revoke', () => {
    it('should revoke a key', async () => {
      const { apiKey } = await service.create({
        name: 'To Revoke',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      const revoked = await service.revoke(apiKey.id);
      expect(revoked).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const revoked = await service.revoke('nonexistent-id');
      expect(revoked).toBe(false);
    });

    it('should return false if already revoked', async () => {
      const { apiKey } = await service.create({
        name: 'Already Revoked',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      await service.revoke(apiKey.id);
      const secondRevoke = await service.revoke(apiKey.id);
      expect(secondRevoke).toBe(false);
    });
  });

  describe('listByOwner', () => {
    it('should list keys for an owner', async () => {
      await service.create({
        name: 'Key 1',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });
      await service.create({
        name: 'Key 2',
        environment: 'test',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });
      await service.create({
        name: 'Other Key',
        environment: 'live',
        ownerId: 'user-2',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      const keys = await service.listByOwner('user-1');
      expect(keys).toHaveLength(2);
      expect(keys.every((k) => k.ownerId === 'user-1')).toBe(true);
    });
  });

  describe('trackUsage', () => {
    it('should increment usage count', async () => {
      const { key, apiKey } = await service.create({
        name: 'Usage Key',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: [],
        metadata: {},
      });

      await service.trackUsage(apiKey.id);
      await service.trackUsage(apiKey.id);

      const result = await service.validate(key);
      expect(result.apiKey!.usageCount).toBe(2);
      expect(result.apiKey!.lastUsedAt).toBeInstanceOf(Date);
    });
  });
});
