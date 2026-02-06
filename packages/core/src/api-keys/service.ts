/**
 * API Key Management — Service
 *
 * Implements key generation, hashing, validation, usage tracking, and revocation.
 * Keys are never stored in plain text — only SHA-256 hashes.
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  type APIKey,
  type APIKeyCreationResult,
  type APIKeyValidationResult,
  type APIKeyService,
  type CreateAPIKeyInput,
  type KeyEnvironment,
  KEY_PREFIXES,
  CreateAPIKeySchema,
} from './types.js';

// ---------------------------------------------------------------------------
// Key Generation
// ---------------------------------------------------------------------------

/**
 * Generate a random API key with the appropriate prefix.
 * Format: vor_live_<32 random chars> or vor_test_<32 random chars>
 */
export function generateAPIKey(environment: KeyEnvironment): string {
  const prefix = KEY_PREFIXES[environment];
  const random = randomBytes(24).toString('base64url');
  return `${prefix}${random}`;
}

/**
 * Hash an API key using SHA-256.
 */
export function hashAPIKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

/**
 * Extract the prefix from a key (first 13 characters for identification).
 * e.g., "vor_live_abc1" from "vor_live_abc1defg..."
 */
export function extractKeyPrefix(key: string): string {
  return key.substring(0, 13);
}

/**
 * Parse the environment from a key prefix.
 */
export function parseKeyEnvironment(key: string): KeyEnvironment | null {
  if (key.startsWith(KEY_PREFIXES.live)) return 'live';
  if (key.startsWith(KEY_PREFIXES.test)) return 'test';
  return null;
}

// ---------------------------------------------------------------------------
// In-Memory Store (for development / testing)
// ---------------------------------------------------------------------------

export interface APIKeyStore {
  save(apiKey: APIKey): Promise<void>;
  findByHash(keyHash: string): Promise<APIKey | null>;
  findById(id: string): Promise<APIKey | null>;
  findByOwner(ownerId: string): Promise<APIKey[]>;
  update(id: string, updates: Partial<APIKey>): Promise<void>;
}

/**
 * Create an in-memory API key store (for testing and development).
 */
export function createInMemoryKeyStore(): APIKeyStore {
  const keys = new Map<string, APIKey>();
  const hashIndex = new Map<string, string>(); // keyHash -> id

  return {
    async save(apiKey: APIKey): Promise<void> {
      keys.set(apiKey.id, { ...apiKey });
      hashIndex.set(apiKey.keyHash, apiKey.id);
    },

    async findByHash(keyHash: string): Promise<APIKey | null> {
      const id = hashIndex.get(keyHash);
      if (!id) return null;
      const key = keys.get(id);
      return key ? { ...key } : null;
    },

    async findById(id: string): Promise<APIKey | null> {
      const key = keys.get(id);
      return key ? { ...key } : null;
    },

    async findByOwner(ownerId: string): Promise<APIKey[]> {
      return Array.from(keys.values())
        .filter((k) => k.ownerId === ownerId)
        .map((k) => ({ ...k }));
    },

    async update(id: string, updates: Partial<APIKey>): Promise<void> {
      const existing = keys.get(id);
      if (existing) {
        const updated = { ...existing, ...updates };
        keys.set(id, updated);
        if (updates.keyHash) {
          hashIndex.set(updates.keyHash, id);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// API Key Service
// ---------------------------------------------------------------------------

/**
 * Create an API key service.
 */
export function createAPIKeyService(store: APIKeyStore): APIKeyService {
  return {
    async create(input: CreateAPIKeyInput): Promise<APIKeyCreationResult> {
      const validated = CreateAPIKeySchema.parse(input);

      // Generate the key
      const fullKey = generateAPIKey(validated.environment);
      const keyHash = hashAPIKey(fullKey);
      const prefix = extractKeyPrefix(fullKey);

      const apiKey: APIKey = {
        id: randomBytes(16).toString('hex'),
        name: validated.name,
        prefix,
        keyHash,
        environment: validated.environment,
        ownerId: validated.ownerId,
        rateLimit: validated.rateLimit,
        usageCount: 0,
        lastUsedAt: null,
        expiresAt: validated.expiresAt,
        revokedAt: null,
        scopes: validated.scopes,
        metadata: validated.metadata,
        createdAt: new Date(),
      };

      await store.save(apiKey);

      return { key: fullKey, apiKey };
    },

    async validate(key: string): Promise<APIKeyValidationResult> {
      // Validate key format
      const env = parseKeyEnvironment(key);
      if (!env) {
        return { valid: false, error: 'invalid' };
      }

      // Find by hash
      const keyHash = hashAPIKey(key);
      const apiKey = await store.findByHash(keyHash);

      if (!apiKey) {
        return { valid: false, error: 'invalid' };
      }

      // Check if revoked
      if (apiKey.revokedAt) {
        return { valid: false, apiKey, error: 'revoked' };
      }

      // Check if expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return { valid: false, apiKey, error: 'expired' };
      }

      return { valid: true, apiKey };
    },

    async revoke(id: string): Promise<boolean> {
      const apiKey = await store.findById(id);
      if (!apiKey) return false;
      if (apiKey.revokedAt) return false;

      await store.update(id, { revokedAt: new Date() });
      return true;
    },

    async listByOwner(ownerId: string): Promise<APIKey[]> {
      return store.findByOwner(ownerId);
    },

    async trackUsage(id: string): Promise<void> {
      const apiKey = await store.findById(id);
      if (apiKey) {
        await store.update(id, {
          usageCount: apiKey.usageCount + 1,
          lastUsedAt: new Date(),
        });
      }
    },
  };
}
