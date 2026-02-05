/**
 * @aor/core - Agent on Rails Core Package
 *
 * The core package provides the fundamental building blocks:
 * - API: Hono server + tRPC for type-safe endpoints
 * - Database: Drizzle ORM with PostgreSQL
 * - Security: JWT authentication + Argon2 password hashing + authorization guards
 * - Shared: Error classes, types, and utilities
 *
 * Import from sub-paths for tree-shaking:
 *   import { createServer } from '@aor/core/api';
 *   import { createDatabase } from '@aor/core/database';
 *   import { signAccessToken } from '@aor/core/security';
 */

export * from './api/index.js';
export * from './database/index.js';
export * from './security/index.js';
export * from './shared/index.js';
