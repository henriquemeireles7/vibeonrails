/**
 * Feature Flags
 *
 * Simple feature flag system that reads from environment variables
 * with fallback to configured defaults. Use this to gate features
 * behind flags that can be toggled without code changes.
 *
 * Usage:
 *   const flags = createFeatureFlags([
 *     { name: 'payments', defaultValue: true, envVar: 'FEATURE_PAYMENTS_ENABLED' },
 *     { name: 'admin', defaultValue: false, envVar: 'FEATURE_ADMIN_ENABLED' },
 *   ]);
 *
 *   if (flags.isEnabled('payments')) { ... }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Definition of a single feature flag */
export interface FeatureFlag {
  /** Unique name of the feature flag */
  name: string;
  /** Default value when env var is not set */
  defaultValue: boolean;
  /** Environment variable to read the flag from (optional) */
  envVar?: string;
}

/** Configuration input for createFeatureFlags */
export type FeatureFlagConfig = FeatureFlag[];

/** Feature flags manager instance */
export interface FeatureFlagManager {
  /** Check if a named feature flag is enabled */
  isEnabled(name: string): boolean;
  /** Get all flag values as a name->boolean record */
  getAll(): Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a feature flags manager from a list of flag definitions.
 *
 * Reads the value from the environment variable (if specified),
 * parsing "true"/"1" as enabled and everything else as disabled.
 * Falls back to the default value if the env var is not set.
 *
 * @param definitions - Array of feature flag definitions
 * @returns Feature flag manager with isEnabled and getAll methods
 */
export function createFeatureFlags(
  definitions: FeatureFlagConfig,
): FeatureFlagManager {
  const flags = new Map<string, boolean>();

  for (const def of definitions) {
    let value = def.defaultValue;

    if (def.envVar) {
      const envValue = process.env[def.envVar];
      if (envValue !== undefined) {
        value = envValue === "true" || envValue === "1";
      }
    }

    flags.set(def.name, value);
  }

  return {
    isEnabled(name: string): boolean {
      return flags.get(name) ?? false;
    },

    getAll(): Record<string, boolean> {
      const result: Record<string, boolean> = {};
      for (const [name, value] of flags) {
        result[name] = value;
      }
      return result;
    },
  };
}
