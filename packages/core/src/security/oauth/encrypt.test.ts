import { describe, it, expect } from 'vitest';
import {
  deriveEncryptionKey,
  encryptToken,
  decryptToken,
} from './encrypt.js';
import type { OAuthToken } from './types.js';

const TEST_JWT_SECRET =
  'a-very-long-secret-that-is-at-least-32-chars-long-for-testing';

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

describe('deriveEncryptionKey', () => {
  it('should derive a 64-char hex key', async () => {
    const key = await deriveEncryptionKey(TEST_JWT_SECRET);
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it('should produce deterministic output for same input', async () => {
    const key1 = await deriveEncryptionKey(TEST_JWT_SECRET);
    const key2 = await deriveEncryptionKey(TEST_JWT_SECRET);
    expect(key1).toBe(key2);
  });

  it('should produce different keys for different secrets', async () => {
    const key1 = await deriveEncryptionKey(TEST_JWT_SECRET);
    const key2 = await deriveEncryptionKey(
      'another-secret-that-is-also-at-least-32-characters',
    );
    expect(key1).not.toBe(key2);
  });

  it('should reject secrets shorter than 32 characters', async () => {
    await expect(deriveEncryptionKey('short')).rejects.toThrow(
      'JWT_SECRET must be at least 32 characters',
    );
  });

  it('should reject empty secrets', async () => {
    await expect(deriveEncryptionKey('')).rejects.toThrow(
      'JWT_SECRET must be at least 32 characters',
    );
  });
});

describe('encryptToken / decryptToken', () => {
  it('should encrypt and decrypt a token round-trip', async () => {
    const token = createTestToken();
    const encrypted = await encryptToken(token, TEST_JWT_SECRET);
    const decrypted = await decryptToken(encrypted, TEST_JWT_SECRET);

    expect(decrypted).not.toBeNull();
    expect(decrypted!.provider).toBe(token.provider);
    expect(decrypted!.accessToken).toBe(token.accessToken);
    expect(decrypted!.refreshToken).toBe(token.refreshToken);
    expect(decrypted!.scopes).toEqual(token.scopes);
  });

  it('should produce different ciphertext for same token (random IV)', async () => {
    const token = createTestToken();
    const encrypted1 = await encryptToken(token, TEST_JWT_SECRET);
    const encrypted2 = await encryptToken(token, TEST_JWT_SECRET);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should return null for wrong secret', async () => {
    const token = createTestToken();
    const encrypted = await encryptToken(token, TEST_JWT_SECRET);
    const decrypted = await decryptToken(
      encrypted,
      'wrong-secret-that-is-at-least-32-characters-long',
    );
    expect(decrypted).toBeNull();
  });

  it('should return null for tampered ciphertext', async () => {
    const token = createTestToken();
    const encrypted = await encryptToken(token, TEST_JWT_SECRET);
    const tampered = encrypted.slice(0, -4) + 'XXXX';
    const decrypted = await decryptToken(tampered, TEST_JWT_SECRET);
    expect(decrypted).toBeNull();
  });

  it('should return null for invalid base64', async () => {
    const decrypted = await decryptToken('not-valid!!!', TEST_JWT_SECRET);
    expect(decrypted).toBeNull();
  });

  it('should handle tokens without optional fields', async () => {
    const token = createTestToken({
      refreshToken: undefined,
      expiresAt: undefined,
      lastRefreshedAt: undefined,
    });
    const encrypted = await encryptToken(token, TEST_JWT_SECRET);
    const decrypted = await decryptToken(encrypted, TEST_JWT_SECRET);

    expect(decrypted).not.toBeNull();
    expect(decrypted!.refreshToken).toBeUndefined();
    expect(decrypted!.expiresAt).toBeUndefined();
  });

  it('should handle tokens with metadata', async () => {
    const token = createTestToken({
      metadata: { userId: '12345', accountName: '@test' },
    });
    const encrypted = await encryptToken(token, TEST_JWT_SECRET);
    const decrypted = await decryptToken(encrypted, TEST_JWT_SECRET);

    expect(decrypted).not.toBeNull();
    expect(decrypted!.metadata).toEqual({
      userId: '12345',
      accountName: '@test',
    });
  });
});
