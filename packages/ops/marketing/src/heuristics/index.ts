/**
 * Heuristics — Barrel Export
 *
 * Content primitives: clients, products, hooks, stories,
 * concepts, branding, CTAs.
 */

// Types
export type {
  HeuristicType,
  BaseHeuristic,
  ClientHeuristic,
  ProductHeuristic,
  HookHeuristic,
  StoryHeuristic,
  ConceptHeuristic,
  BrandingHeuristic,
  CTAHeuristic,
  HeuristicFrontmatter,
  LoadedHeuristic,
} from "./types.js";

export {
  HEURISTIC_TYPES,
  HeuristicTypeSchema,
  BaseHeuristicSchema,
  ClientHeuristicSchema,
  ProductHeuristicSchema,
  HookHeuristicSchema,
  StoryHeuristicSchema,
  ConceptHeuristicSchema,
  BrandingHeuristicSchema,
  CTAHeuristicSchema,
  HeuristicFrontmatterSchema,
  HEURISTIC_SCHEMA_MAP,
  HEURISTIC_TEMPLATES,
} from "./types.js";

// Loader
export {
  parseFrontmatter,
  getGitHash,
  loadHeuristicFile,
  loadHeuristics,
  loadHeuristicsByType,
  loadHeuristicById,
  loadActiveHeuristics,
  loadHeuristicsByTag,
} from "./loader.js";

// CLI
export { listHeuristics, createHeuristic, formatHeuristicList } from "./cli.js";
export type {
  ListHeuristicsOptions,
  HeuristicListItem,
  CreateHeuristicOptions,
  CreateHeuristicResult,
} from "./cli.js";
