/**
 * Starlight configuration factory.
 *
 * Creates an Astro config with Starlight integration pre-configured
 * with VibeonRails conventions: default theme, sidebar helpers,
 * edit links, and search.
 *
 * Usage:
 * ```typescript
 * // astro.config.mjs
 * import { createDocsConfig } from '@vibeonrails/docs/presets';
 *
 * export default createDocsConfig({
 *   title: 'My Project',
 *   sidebar: [...],
 * });
 * ```
 */

import type { SidebarItem } from './sidebar.js';

/** Options for the Starlight integration. */
export interface StarlightOptions {
  /** Site title shown in the header. */
  title: string;
  /** Site description for meta tags. */
  description?: string;
  /** GitHub repository URL for "Edit this page" links. */
  editLinkBaseUrl?: string;
  /** Social links (GitHub, Discord, Twitter, etc.). */
  social?: Record<string, string>;
  /** Sidebar configuration. Use sidebar helpers from @vibeonrails/docs/presets. */
  sidebar?: SidebarItem[];
  /** Paths to custom CSS files (appended after the default theme). */
  customCss?: string[];
  /** Base URL for the site (e.g., '/docs/'). */
  base?: string;
  /** Site URL for sitemap generation. */
  site?: string;
  /** Disable the default VibeonRails theme. */
  disableDefaultTheme?: boolean;
}

/** Full Astro config shape produced by createDocsConfig. */
export interface DocsConfig {
  site?: string;
  base?: string;
  integrations: unknown[];
}

/**
 * Create an Astro configuration with Starlight integration.
 *
 * This is a factory that returns a plain config object. The consumer
 * passes it to `defineConfig()` in their `astro.config.mjs`. We cannot
 * call `defineConfig` or import `starlight` here because those are
 * peer dependencies resolved at the consumer's project level.
 *
 * Instead, this function returns a serializable config descriptor that
 * the consumer spreads into their Astro config.
 *
 * @param options - Documentation site configuration
 * @returns Starlight configuration options (to be passed to starlight())
 */
export function createStarlightConfig(options: StarlightOptions): Record<string, unknown> {
  const css: string[] = [];

  if (!options.disableDefaultTheme) {
    // Consumer should generate theme CSS into a file and reference it,
    // or use the inline theme path provided by this package.
    // For convention, we tell them to use './src/styles/vibeonrails-theme.css'
  }

  if (options.customCss) {
    css.push(...options.customCss);
  }

  const config: Record<string, unknown> = {
    title: options.title,
  };

  if (options.description) {
    config.description = options.description;
  }

  if (options.social) {
    config.social = options.social;
  }

  if (options.editLinkBaseUrl) {
    config.editLink = { baseUrl: options.editLinkBaseUrl };
  }

  if (options.sidebar) {
    config.sidebar = options.sidebar;
  }

  if (css.length > 0) {
    config.customCss = css;
  }

  return config;
}

/**
 * Default Starlight options for VibeonRails documentation sites.
 *
 * Provides sensible defaults that can be spread and overridden:
 * - GitHub social link placeholder
 * - Edit link placeholder
 * - Default description
 */
export const defaultStarlightOptions: Partial<StarlightOptions> = {
  description: 'Documentation powered by VibeonRails',
};
