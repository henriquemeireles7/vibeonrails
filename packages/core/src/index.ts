/**
 * @vibeonrails/core - Vibe on Rails Core Package
 *
 * The core package provides the fundamental building blocks:
 * - API: Hono server + tRPC for type-safe endpoints
 * - Database: Drizzle ORM with PostgreSQL
 * - Security: JWT authentication + Argon2 password hashing + authorization guards
 * - Shared: Error classes, types, and utilities
 *
 * Import from sub-paths for tree-shaking:
 *   import { createServer } from '@vibeonrails/core/api';
 *   import { createDatabase } from '@vibeonrails/core/database';
 *   import { signAccessToken } from '@vibeonrails/core/security';
 */

export * from "./api/index.js";
export * from "./database/index.js";
export * from "./security/index.js";
export * from "./shared/index.js";
export * from "./integrations/index.js";
export * from "./webhooks/index.js";
export * from "./api-keys/index.js";
export * from "./errors/index.js";
export * from "./config/index.js";
export * from "./manifest/index.js";
export * from "./env/index.js";
export * from "./conventions/index.js";
