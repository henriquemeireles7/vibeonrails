/**
 * API Key Management — Types
 *
 * Issue and manage API keys for the user's customers.
 * Keys are hashed in the database (never stored in plain text).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Key Prefix Format
// ---------------------------------------------------------------------------

export const KEY_PREFIXES = {
  live: 'vor_live_',
  test: 'vor_test_',
} as const;

export type KeyEnvironment = keyof typeof KEY_PREFIXES;

// ---------------------------------------------------------------------------
// API Key Types
// ---------------------------------------------------------------------------

export const CreateAPIKeySchema = z.object({
  /** Display name for the key */
  name: z.string().min(1).max(255),

  /** Environment: live or test */
  environment: z.enum(['live', 'test']).default('live'),

  /** User or organization ID that owns this key */
  ownerId: z.string().min(1),

  /** Rate limit (requests per minute). null = unlimited */
  rateLimit: z.number().int().positive().nullable().default(null),

  /** Optional expiration date */
  expiresAt: z.date().nullable().default(null),

  /** Optional scopes/permissions */
  scopes: z.array(z.string()).default([]),

  /** Optional metadata */
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CreateAPIKeyInput = z.infer<typeof CreateAPIKeySchema>;

export interface APIKey {
  id: string;
  name: string;
  /** Only the prefix is stored (e.g., "vor_live_abc1") for identification */
  prefix: string;
  /** SHA-256 hash of the full key */
  keyHash: string;
  environment: KeyEnvironment;
  ownerId: string;
  rateLimit: number | null;
  usageCount: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/** Returned only once on creation (full key is never stored) */
export interface APIKeyCreationResult {
  /** The full API key (only shown once) */
  key: string;
  /** The key record (without the plaintext key) */
  apiKey: APIKey;
}

export interface APIKeyValidationResult {
  valid: boolean;
  apiKey?: APIKey;
  error?: 'invalid' | 'expired' | 'revoked' | 'rate_limited';
}

// ---------------------------------------------------------------------------
// API Key Service Interface
// ---------------------------------------------------------------------------

export interface APIKeyService {
  /** Create a new API key. Returns the full key (only shown once) */
  create(input: CreateAPIKeyInput): Promise<APIKeyCreationResult>;

  /** Validate a key and return the associated record */
  validate(key: string): Promise<APIKeyValidationResult>;

  /** Revoke a key by ID */
  revoke(id: string): Promise<boolean>;

  /** List keys for an owner (keys are masked) */
  listByOwner(ownerId: string): Promise<APIKey[]>;

  /** Track usage of a key */
  trackUsage(id: string): Promise<void>;
}
