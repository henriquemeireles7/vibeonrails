/**
 * @vibeonrails/infra - Vibe on Rails Infrastructure Package
 *
 * Provides infrastructure modules for production applications:
 * - Health: Registry-based health check system
 * - Logging: Structured JSON logging with child loggers
 * - Queue: BullMQ-based background job processing
 * - Email: Resend-based transactional email with Markdown templates
 * - Cache: Redis-based caching with JSON serialization
 * - Storage: S3-compatible file storage
 *
 * Import from sub-paths for tree-shaking:
 *   import { registerHealthCheck } from '@vibeonrails/infra/health';
 *   import { logger } from '@vibeonrails/infra/logging';
 *   import { defineJob, enqueue } from '@vibeonrails/infra/queue';
 */

export * from './health/index.js';
export * from './logging/index.js';
export * from './queue/index.js';
export * from './email/index.js';
export * from './cache/index.js';
export * from './storage/index.js';
