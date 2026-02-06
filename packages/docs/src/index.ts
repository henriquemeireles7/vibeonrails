/**
 * @vibeonrails/docs — Documentation framework for VibeonRails projects.
 *
 * Main entry point re-exporting all public APIs:
 * - Presets: Starlight config factory, sidebar helpers, theme utilities
 * - Components: Custom MDX components for documentation
 * - Plugins: Remark/Rehype plugins for content transformation
 *
 * @example
 * ```typescript
 * // Import presets for astro.config.mjs
 * import { createStarlightConfig, link, group } from '@vibeonrails/docs/presets';
 *
 * // Import components for MDX pages
 * import { PackageInstall, ApiReference } from '@vibeonrails/docs/components';
 *
 * // Import plugins for markdown processing
 * import { remarkSkillLoader, remarkApiGen } from '@vibeonrails/docs/plugins';
 * ```
 */

// Presets
export {
  createStarlightConfig,
  defaultStarlightOptions,
  type StarlightOptions,
  type DocsConfig,
  link,
  group,
  autogenerate,
  createDiataxisSidebar,
  type SidebarLink,
  type SidebarGroup,
  type SidebarAutoGenerate,
  type SidebarItem,
  generateThemeCSS,
  defaultThemeCSS,
  type ThemeOptions,
} from './presets/index.js';

// Components
export {
  ApiReference,
  type ApiReferenceProps,
  type ApiParam,
  CodeExample,
  type CodeExampleProps,
  type CodeTab,
  PackageInstall,
  type PackageInstallProps,
  type PackageManager,
  PropTable,
  type PropTableProps,
  type PropDef,
  StatusBadge,
  type StatusBadgeProps,
  type BadgeStatus,
} from './components/index.js';

// Plugins
export {
  remarkSkillLoader,
  resolveSkillContent,
  type SkillLoaderOptions,
  remarkApiGen,
  parseApiDirective,
  generateApiNodes,
  type ApiGenOptions,
  type ApiDirective,
} from './plugins/index.js';
