/**
 * Error System — Barrel Export
 */

// Catalog
export type { ErrorCatalogEntry, ErrorDomain } from './catalog.js';
export {
  ERROR_CATALOG,
  ERROR_DOMAINS,
  getError,
  interpolateMessage,
  getAllErrorCodes,
  getErrorsByDomain,
} from './catalog.js';

// CatalogError
export { CatalogError } from './app-error.js';

// Error Reporter
export {
  ErrorReporter,
  createErrorReporter,
  type ErrorReport,
  type ErrorContext,
  type ErrorQueryOptions,
  type ErrorReporterOptions,
} from './reporter.js';
