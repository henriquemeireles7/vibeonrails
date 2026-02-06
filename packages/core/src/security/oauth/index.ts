/**
 * OAuth Token Store — Barrel Export
 *
 * Encrypted storage for third-party OAuth tokens.
 * Used by `vibe connect <provider>` to store tokens securely.
 */

// Types
export type {
  OAuthToken,
  TokenRefreshConfig,
  CredentialsFile,
  TokenStore,
  TokenStatus,
} from './types.js';

export {
  OAuthTokenSchema,
  TokenRefreshConfigSchema,
  CredentialsFileSchema,
} from './types.js';

// Encryption
export { deriveEncryptionKey, encryptToken, decryptToken } from './encrypt.js';

// Store
export { createFileTokenStore, type FileTokenStoreOptions } from './store.js';
