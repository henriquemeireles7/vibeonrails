/**
 * Feature Flags — Implementation
 *
 * Two-layer system:
 * Layer 1: JSON file definitions (source of truth, git-tracked)
 * Layer 2: Redis runtime overrides (instant toggle, no deploy needed)
 *
 * isEnabled() checks Redis first, falls back to JSON.
 */

import { createHash } from 'node:crypto';
import {
  type FlagDefinition,
  type FlagConfig,
  type FlagContext,
  type FlagService,
  type FlagState,
  FlagConfigSchema,
} from './types.js';

// ---------------------------------------------------------------------------
// Redis Interface (minimal — avoids hard dep)
// ---------------------------------------------------------------------------

export interface FlagRedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Percentage Rollout
// ---------------------------------------------------------------------------

/**
 * Deterministic percentage check based on userId.
 * Uses a hash to ensure the same user always gets the same result.
 */
function isInPercentage(
  userId: string,
  flagName: string,
  percentage: number,
): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  const hash = createHash('sha256')
    .update(`${flagName}:${userId}`)
    .digest('hex');
  // Take first 8 hex chars (32 bits) and convert to 0-99 range
  const value = parseInt(hash.substring(0, 8), 16) % 100;
  return value < percentage;
}

// ---------------------------------------------------------------------------
// Flag Service Factory
// ---------------------------------------------------------------------------

export interface CreateFlagServiceOptions {
  /** Flag definitions (parsed JSON config) */
  config: FlagConfig;

  /** Optional Redis client for runtime overrides */
  redis?: FlagRedisLike;

  /** Redis key prefix for flag overrides */
  redisPrefix?: string;
}

/**
 * Create a feature flag service.
 *
 * @example
 * ```ts
 * // JSON-only mode (no Redis)
 * const flags = createFlagService({
 *   config: { version: 1, flags: [{ name: 'dark-mode', defaultValue: false }] },
 * });
 *
 * // With Redis for runtime overrides
 * const flags = createFlagService({
 *   config: loadedConfig,
 *   redis: redisClient,
 * });
 * ```
 */
export function createFlagService(
  options: CreateFlagServiceOptions,
): FlagService {
  const validConfig = FlagConfigSchema.parse(options.config);
  let flags = new Map<string, FlagDefinition>(
    validConfig.flags.map((f) => [f.name, f]),
  );
  const redis = options.redis;
  const redisPrefix = options.redisPrefix ?? 'flag:';

  function getFlag(name: string): FlagDefinition | null {
    return flags.get(name) ?? null;
  }

  async function getRedisOverride(name: string): Promise<boolean | null> {
    if (!redis) return null;
    const value = await redis.get(`${redisPrefix}${name}`);
    if (value === null) return null;
    return value === 'true';
  }

  return {
    async isEnabled(name: string, context?: FlagContext): Promise<boolean> {
      const flag = getFlag(name);
      if (!flag) return false;
      if (!flag.enabled) return false;

      // Check Redis override first
      const override = await getRedisOverride(name);
      if (override !== null) {
        return override;
      }

      // Use defined value
      if (flag.type === 'boolean') {
        return flag.defaultValue as boolean;
      }

      // Percentage rollout
      if (flag.type === 'percentage') {
        const percentage = flag.defaultValue as number;
        if (!context?.userId) {
          // No userId — use the percentage as a probability
          return Math.random() * 100 < percentage;
        }
        return isInPercentage(context.userId, name, percentage);
      }

      return false;
    },

    async getValue(name: string): Promise<boolean | number | null> {
      const flag = getFlag(name);
      if (!flag) return null;

      // Check Redis override
      const override = await getRedisOverride(name);
      if (override !== null) {
        return override;
      }

      return flag.defaultValue;
    },

    async list(): Promise<FlagState[]> {
      const states: FlagState[] = [];

      for (const flag of flags.values()) {
        const override = await getRedisOverride(flag.name);
        const effectiveValue =
          override !== null ? override : flag.defaultValue;

        states.push({
          name: flag.name,
          description: flag.description,
          type: flag.type,
          definedValue: flag.defaultValue,
          runtimeOverride: override,
          effectiveValue,
        });
      }

      return states;
    },

    async toggle(name: string, value: boolean): Promise<void> {
      if (!redis) {
        throw new Error(
          'Redis is required for runtime flag overrides. Configure Redis or change the JSON config and redeploy.',
        );
      }
      await redis.set(`${redisPrefix}${name}`, String(value));
    },

    async removeOverride(name: string): Promise<void> {
      if (!redis) return;
      await redis.del(`${redisPrefix}${name}`);
    },

    async reload(): Promise<void> {
      // Re-parse the config (in case it was modified)
      const reloaded = FlagConfigSchema.parse(options.config);
      flags = new Map(reloaded.flags.map((f) => [f.name, f]));
    },
  };
}
