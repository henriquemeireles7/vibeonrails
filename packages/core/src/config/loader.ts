/**
 * Config Loader
 *
 * Loads and validates vibe.config.ts at startup.
 * Falls back to all defaults if the file is missing.
 */

import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type VibeConfig,
  VibeConfigSchema,
  getDefaultConfig,
} from './schema.js';

// ---------------------------------------------------------------------------
// Singleton Config Cache
// ---------------------------------------------------------------------------

let cachedConfig: VibeConfig | null = null;

/**
 * Get the current config (must call loadConfig first, or returns defaults).
 */
export function getConfig(): VibeConfig {
  if (!cachedConfig) {
    cachedConfig = getDefaultConfig();
  }
  return cachedConfig;
}

/**
 * Set the config directly (for testing).
 */
export function setConfig(config: VibeConfig): void {
  cachedConfig = config;
}

/**
 * Reset the config cache (for testing).
 */
export function resetConfig(): void {
  cachedConfig = null;
}

// ---------------------------------------------------------------------------
// Config Loading
// ---------------------------------------------------------------------------

/**
 * Load config from a vibe.config.ts file.
 *
 * Uses dynamic import for .ts files (requires tsx/esbuild runtime).
 * Falls back to JSON parsing for .json files.
 */
export async function loadConfig(
  projectRoot?: string,
): Promise<VibeConfig> {
  const root = projectRoot ?? process.cwd();

  // Try config file locations in order
  const configPaths = [
    join(root, 'vibe.config.ts'),
    join(root, 'vibe.config.js'),
    join(root, 'vibe.config.json'),
  ];

  for (const configPath of configPaths) {
    try {
      await access(configPath);

      if (configPath.endsWith('.json')) {
        const content = await readFile(configPath, 'utf-8');
        const parsed = JSON.parse(content);
        const config = VibeConfigSchema.parse(parsed);
        cachedConfig = config;
        return config;
      }

      // For .ts and .js files, use dynamic import
      const module = await import(configPath);
      const exported = module.default ?? module;
      const config = VibeConfigSchema.parse(exported);
      cachedConfig = config;
      return config;
    } catch (error) {
      // If file exists but has validation errors, throw
      if (
        error instanceof Error &&
        error.message.includes('validation')
      ) {
        throw error;
      }
      // File doesn't exist or can't be imported — try next
      continue;
    }
  }

  // No config file found — use defaults
  const config = getDefaultConfig();
  cachedConfig = config;
  return config;
}
