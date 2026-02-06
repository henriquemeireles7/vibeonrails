/**
 * Feature Flags — Types
 *
 * Two-layer system: JSON file definitions + optional Redis runtime overrides.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Flag Definition
// ---------------------------------------------------------------------------

export const FlagDefinitionSchema = z.object({
  /** Flag name (unique identifier) */
  name: z.string().min(1),

  /** Human-readable description */
  description: z.string().default(''),

  /** Flag type: boolean or percentage rollout */
  type: z.enum(['boolean', 'percentage']).default('boolean'),

  /** Default value (true/false for boolean, 0-100 for percentage) */
  defaultValue: z.union([z.boolean(), z.number().min(0).max(100)]),

  /** Whether this flag is enabled */
  enabled: z.boolean().default(true),
});

export type FlagDefinition = z.infer<typeof FlagDefinitionSchema>;

// ---------------------------------------------------------------------------
// Flag Config (the JSON file format)
// ---------------------------------------------------------------------------

export const FlagConfigSchema = z.object({
  /** Config version */
  version: z.literal(1).default(1),

  /** Array of flag definitions */
  flags: z.array(FlagDefinitionSchema),
});

export type FlagConfig = z.infer<typeof FlagConfigSchema>;

// ---------------------------------------------------------------------------
// Flag Context
// ---------------------------------------------------------------------------

export interface FlagContext {
  /** User ID for percentage rollouts (hashed for determinism) */
  userId?: string;

  /** Additional context for custom evaluation */
  attributes?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Flag Service Interface
// ---------------------------------------------------------------------------

export interface FlagService {
  /** Check if a flag is enabled */
  isEnabled(name: string, context?: FlagContext): Promise<boolean>;

  /** Get the value of a flag (boolean or percentage number) */
  getValue(name: string): Promise<boolean | number | null>;

  /** List all defined flags with their current state */
  list(): Promise<FlagState[]>;

  /** Toggle a flag's runtime override (Redis layer) */
  toggle(name: string, value: boolean): Promise<void>;

  /** Remove a runtime override (fall back to JSON definition) */
  removeOverride(name: string): Promise<void>;

  /** Reload flags from the JSON config */
  reload(): Promise<void>;
}

export interface FlagState {
  name: string;
  description: string;
  type: 'boolean' | 'percentage';
  definedValue: boolean | number;
  runtimeOverride: boolean | null;
  effectiveValue: boolean | number;
}
