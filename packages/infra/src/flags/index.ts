/**
 * Feature Flags — Barrel Export
 */

export type {
  FlagDefinition,
  FlagConfig,
  FlagContext,
  FlagService,
  FlagState,
} from './types.js';

export { FlagDefinitionSchema, FlagConfigSchema } from './types.js';

export {
  createFlagService,
  type CreateFlagServiceOptions,
  type FlagRedisLike,
} from './flags.js';
