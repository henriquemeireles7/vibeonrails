/**
 * OAuth Token Store — Types and Schemas
 *
 * Defines the types for encrypted OAuth token storage.
 * Used by `vibe connect <provider>` to store tokens securely.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// OAuth Token
// ---------------------------------------------------------------------------

export const OAuthTokenSchema = z.object({
  /** The OAuth provider identifier (e.g., "twitter", "bluesky", "stripe") */
  provider: z.string().min(1),

  /** The access token */
  accessToken: z.string().min(1),

  /** The refresh token (optional — not all providers issue refresh tokens) */
  refreshToken: z.string().optional(),

  /** Token type (usually "Bearer") */
  tokenType: z.string().default('Bearer'),

  /** When the access token expires (ISO 8601 string) */
  expiresAt: z.string().datetime().optional(),

  /** OAuth scopes granted */
  scopes: z.array(z.string()).default([]),

  /** When the token was stored (ISO 8601 string) */
  storedAt: z.string().datetime(),

  /** When the token was last refreshed (ISO 8601 string) */
  lastRefreshedAt: z.string().datetime().optional(),

  /** Additional provider-specific metadata */
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type OAuthToken = z.infer<typeof OAuthTokenSchema>;

// ---------------------------------------------------------------------------
// Token Refresh Configuration
// ---------------------------------------------------------------------------

export const TokenRefreshConfigSchema = z.object({
  /** URL to call for token refresh */
  refreshUrl: z.string().url(),

  /** HTTP method for refresh (usually POST) */
  method: z.enum(['POST', 'GET']).default('POST'),

  /** Additional headers to send with refresh request */
  headers: z.record(z.string(), z.string()).default({}),

  /** Client ID for OAuth refresh flow */
  clientId: z.string().optional(),

  /** Client secret for OAuth refresh flow */
  clientSecret: z.string().optional(),

  /** How many seconds before expiry to trigger a refresh */
  refreshBeforeExpiry: z.number().int().min(0).default(300),

  /** Maximum number of refresh retries */
  maxRetries: z.number().int().min(0).max(10).default(3),
});

export type TokenRefreshConfig = z.infer<typeof TokenRefreshConfigSchema>;

// ---------------------------------------------------------------------------
// Encrypted Credentials File Format
// ---------------------------------------------------------------------------

export const CredentialsFileSchema = z.object({
  /** File format version for forward compatibility */
  version: z.literal(1),

  /** Map of provider name to encrypted token data */
  tokens: z.record(z.string(), z.string()),

  /** Map of provider name to refresh config (unencrypted — no secrets) */
  refreshConfigs: z.record(z.string(), TokenRefreshConfigSchema).default({}),
});

export type CredentialsFile = z.infer<typeof CredentialsFileSchema>;

// ---------------------------------------------------------------------------
// Token Store Interface
// ---------------------------------------------------------------------------

export interface TokenStore {
  /** Get a decrypted token for a provider */
  get(provider: string): Promise<OAuthToken | null>;

  /** Store an encrypted token for a provider */
  set(provider: string, token: OAuthToken): Promise<void>;

  /** Remove a token for a provider */
  remove(provider: string): Promise<boolean>;

  /** List all stored provider names */
  list(): Promise<string[]>;

  /** Check if a token exists for a provider */
  has(provider: string): Promise<boolean>;

  /** Get refresh config for a provider */
  getRefreshConfig(provider: string): Promise<TokenRefreshConfig | null>;

  /** Set refresh config for a provider */
  setRefreshConfig(
    provider: string,
    config: TokenRefreshConfig,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Token Status (for CLI display)
// ---------------------------------------------------------------------------

export interface TokenStatus {
  provider: string;
  hasToken: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  lastRefreshedAt: string | null;
  scopes: string[];
}
