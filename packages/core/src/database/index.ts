/**
 * @vibeonrails/core/database - Database module barrel export
 */

export { createDatabase, type Database, type DatabasePoolOptions } from "./client.js";
export { runMigrations } from "./migrate.js";
export * from "./schema/index.js";
export * from "./repositories/index.js";
export {
  clampPagination,
  clampCursorPagination,
  paginatedResult,
  cursorPaginatedResult,
  PAGINATION_DEFAULTS,
  type PaginationOptions,
  type OffsetPaginatedResult,
  type CursorPaginationOptions,
  type CursorPaginatedResult,
} from "./pagination.js";
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
export { exportUserData, type ExportedUserData } from "./data-export.js";
export { anonymizeUser } from "./data-deletion.js";
export { softDeleteFilter, softDelete, restore } from "./soft-delete.js";
