/**
 * Config — Barrel Export
 */

export type { VibeConfig } from './schema.js';
export { VibeConfigSchema, defineConfig, getDefaultConfig } from './schema.js';
export { loadConfig, getConfig, setConfig, resetConfig } from './loader.js';
