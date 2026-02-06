/**
 * @vibeonrails/core/database - Database module barrel export
 */

export { createDatabase, type Database } from "./client.js";
export { runMigrations } from "./migrate.js";
export * from "./schema/index.js";
export * from "./repositories/index.js";
export { runSeeds, seedDevelopment, seedTest } from "./seeds/index.js";
export type { SeedEnvironment } from "./seeds/index.js";
export {
  QueryAnalyzer,
  createQueryAnalyzer,
  normalizeQuery,
  suggestIndex,
  type TrackedQuery,
  type SlowQueryWarning,
  type NPlusOneDetection,
  type QueryAnalysisReport,
  type QueryAnalyzerOptions,
} from "./analyzer.js";
