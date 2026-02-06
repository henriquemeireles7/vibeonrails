/**
 * API Key Management — Barrel Export
 *
 * Issue and manage API keys for the user's customers.
 */

// Types
export type {
  KeyEnvironment,
  CreateAPIKeyInput,
  APIKey,
  APIKeyCreationResult,
  APIKeyValidationResult,
  APIKeyService,
} from './types.js';

export { KEY_PREFIXES, CreateAPIKeySchema } from './types.js';

// Service
export {
  createAPIKeyService,
  createInMemoryKeyStore,
  generateAPIKey,
  hashAPIKey,
  extractKeyPrefix,
  parseKeyEnvironment,
  type APIKeyStore,
} from './service.js';

// Middleware
export {
  createAPIKeyMiddleware,
  type APIKeyMiddlewareOptions,
} from './middleware.js';

// Schema
export { apiKeys } from './schema.js';
