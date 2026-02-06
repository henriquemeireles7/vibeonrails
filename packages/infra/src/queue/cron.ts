/**
 * Cron Job Definitions — Schedule recurring tasks.
 */

export interface CronJobConfig {
  name: string;
  schedule: string; // Cron expression (e.g., "0 * * * *")
  handler: () => void | Promise<void>;
  enabled?: boolean;
  description?: string;
}

const registry = new Map<string, CronJobConfig>();

/**
 * Define a cron job for scheduling.
 *
 * @example
 * defineCron({
 *   name: "cleanup-sessions",
 *   schedule: "0 0,6,12,18 * * *", // Every 6 hours
 *   handler: async () => { await cleanupExpiredSessions(); },
 * });
 */
export function defineCron(config: CronJobConfig): CronJobConfig {
  const job = { enabled: true, ...config };
  registry.set(config.name, job);
  return job;
}

/**
 * Get all registered cron jobs.
 */
export function getCronJobs(): CronJobConfig[] {
  return Array.from(registry.values());
}

/**
 * Get a specific cron job by name.
 */
export function getCronJob(name: string): CronJobConfig | undefined {
  return registry.get(name);
}

/**
 * Clear all registered cron jobs (for testing).
 */
export function clearCronJobs(): void {
  registry.clear();
}

/**
 * Validate a basic cron expression (5 fields).
 */
export function isValidCronExpression(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  return parts.length === 5;
}
