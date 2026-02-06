/**
 * Analytics — Barrel Export
 */

export type {
  AnalyticsEvent,
  AnalyticsEventInput,
  AnalyticsConfig,
  AnalyticsTracker,
  EventQueryOptions,
  ClientAnalyticsEvent,
} from './types.js';

export { AnalyticsEventSchema, AnalyticsConfigSchema } from './types.js';

export {
  createTracker,
  createInMemoryEventStore,
  type EventStore,
} from './tracker.js';

export { analyticsEvents } from './schema.js';

export {
  parseAnalyticsQuery,
  generateReport,
  type AnalyticsQuery,
  type AnalyticsReport,
  type ReportDataProvider,
} from './query.js';
