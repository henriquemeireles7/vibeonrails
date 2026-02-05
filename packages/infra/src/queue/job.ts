/**
 * Job Definition
 *
 * Define type-safe background jobs with Zod validation, retry policies,
 * and backoff strategies. Jobs are processed by BullMQ workers.
 *
 * Usage:
 *   import { defineJob } from '@aor/infra/queue';
 *
 *   export const sendWelcomeEmail = defineJob({
 *     name: 'send-welcome-email',
 *     schema: z.object({ userId: z.string(), email: z.string() }),
 *     handler: async ({ userId, email }) => { ... },
 *     options: { retries: 3, backoff: 'exponential' },
 *   });
 */

import { z } from 'zod';

export interface JobOptions {
  /** Number of retry attempts on failure (default: 3) */
  retries?: number;
  /** Backoff strategy between retries */
  backoff?: 'fixed' | 'exponential';
  /** Delay between retries in ms (default: 1000) */
  backoffDelay?: number;
  /** Job timeout in ms (default: 30000) */
  timeout?: number;
}

export interface JobDefinition<T extends z.ZodType> {
  name: string;
  schema: T;
  handler: (data: z.infer<T>) => Promise<void>;
  options?: JobOptions;
}

/**
 * Define a typed background job.
 *
 * @param config - Job configuration including name, schema, handler, and options
 * @returns Job definition object
 */
export function defineJob<T extends z.ZodType>(
  config: JobDefinition<T>,
): JobDefinition<T> {
  return config;
}
