/**
 * vibe.config.ts — Schema and Types
 *
 * Defines the Zod schema for the single config file.
 * All configuration (security, sites, flags, analytics, modules)
 * lives in one typed file with TypeScript autocomplete.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Security Config
// ---------------------------------------------------------------------------

const CorsConfigSchema = z.object({
  origins: z.array(z.string()).default(['*']),
  methods: z
    .array(z.string())
    .default(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  credentials: z.boolean().default(true),
});

const RateLimitPresetSchema = z.object({
  max: z.number().int().positive(),
  windowSeconds: z.number().int().positive(),
});

const SecurityConfigSchema = z.object({
  cors: CorsConfigSchema.default({}),
  rateLimit: z
    .object({
      auth: RateLimitPresetSchema.default({ max: 5, windowSeconds: 900 }),
      api: RateLimitPresetSchema.default({ max: 100, windowSeconds: 60 }),
    })
    .default({}),
  csrf: z
    .object({
      enabled: z.boolean().default(true),
      excludePaths: z.array(z.string()).default([]),
    })
    .default({}),
  session: z
    .object({
      maxAge: z.string().default('24h'),
      secure: z.boolean().default(true),
    })
    .default({}),
});

// ---------------------------------------------------------------------------
// Sites Config
// ---------------------------------------------------------------------------

const SiteConfigSchema = z.object({
  enabled: z.boolean().default(false),
  path: z.string().optional(),
});

const SitesConfigSchema = z.object({
  mode: z.enum(['path', 'subdomain']).default('path'),
  blog: SiteConfigSchema.default({}),
  help: SiteConfigSchema.default({}),
  landing: SiteConfigSchema.default({}),
  changelog: SiteConfigSchema.default({}),
  status: SiteConfigSchema.default({}),
});

// ---------------------------------------------------------------------------
// Analytics Config
// ---------------------------------------------------------------------------

const AnalyticsConfigSchema = z.object({
  server: z.boolean().default(true),
  client: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Modules Config
// ---------------------------------------------------------------------------

const ModulesConfigSchema = z.object({
  marketing: z.boolean().default(false),
  sales: z.boolean().default(false),
  supportChat: z.boolean().default(false),
  supportFeedback: z.boolean().default(false),
  finance: z.boolean().default(false),
  notifications: z.boolean().default(false),
  search: z.boolean().default(false),
  companion: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Full Config Schema
// ---------------------------------------------------------------------------

export const VibeConfigSchema = z.object({
  /** Project name */
  name: z.string().default('my-vibe-app'),

  /** Project description */
  description: z.string().default(''),

  /** Security settings */
  security: SecurityConfigSchema.default({}),

  /** Sites settings */
  sites: SitesConfigSchema.default({}),

  /** Feature flags (simple key-value for config file) */
  flags: z.record(z.string(), z.boolean()).default({}),

  /** Analytics settings */
  analytics: AnalyticsConfigSchema.default({}),

  /** Installed modules */
  modules: ModulesConfigSchema.default({}),

  /** Database URL override (default: from DATABASE_URL env var) */
  databaseUrl: z.string().optional(),

  /** Server port (default: 3000) */
  port: z.number().int().positive().default(3000),

  /** Environment (auto-detected from NODE_ENV) */
  env: z.enum(['development', 'production', 'test']).default('development'),
});

export type VibeConfig = z.infer<typeof VibeConfigSchema>;

// ---------------------------------------------------------------------------
// defineConfig Helper
// ---------------------------------------------------------------------------

/**
 * Type-safe config helper for vibe.config.ts.
 * Provides full TypeScript autocomplete for all config options.
 *
 * @example
 * ```ts
 * // vibe.config.ts
 * import { defineConfig } from '@vibeonrails/core/config';
 *
 * export default defineConfig({
 *   name: 'my-app',
 *   security: {
 *     cors: { origins: ['https://myapp.com'] },
 *   },
 *   modules: {
 *     marketing: true,
 *     supportChat: true,
 *   },
 * });
 * ```
 */
export function defineConfig(config: Partial<z.input<typeof VibeConfigSchema>>): VibeConfig {
  return VibeConfigSchema.parse(config);
}

/**
 * Get the default config (all defaults applied).
 */
export function getDefaultConfig(): VibeConfig {
  return VibeConfigSchema.parse({});
}
