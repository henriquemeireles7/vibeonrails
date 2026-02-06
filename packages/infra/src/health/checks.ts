/**
 * Health Check System
 *
 * A registry-based health check system. Services register their own checks,
 * and the health endpoint aggregates them.
 *
 * Usage:
 *   import { registerHealthCheck, runHealthChecks } from '@vibeonrails/infra/health';
 *
 *   registerHealthCheck('database', async () => {
 *     await db.execute(sql`SELECT 1`);
 *     return { status: 'ok' };
 *   });
 *
 *   const health = await runHealthChecks();
 */

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: HealthStatus;
  checks: Record<string, HealthCheckResult>;
  timestamp: string;
  uptimeSeconds: number;
}

type HealthCheckFn = () => Promise<HealthCheckResult>;

const registry = new Map<string, HealthCheckFn>();
const startTime = Date.now();

/**
 * Register a named health check function.
 *
 * @param name - Unique name for this check (e.g., 'database', 'redis')
 * @param check - Async function that returns a health status
 */
export function registerHealthCheck(name: string, check: HealthCheckFn): void {
  registry.set(name, check);
}

/**
 * Remove a registered health check.
 */
export function removeHealthCheck(name: string): void {
  registry.delete(name);
}

/**
 * Run all registered health checks and return a comprehensive report.
 *
 * @returns Health report with overall status and individual check results
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const checks: Record<string, HealthCheckResult> = {};

  for (const [name, check] of registry) {
    const start = Date.now();
    try {
      const result = await check();
      checks[name] = {
        ...result,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      checks[name] = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - start,
      };
    }
  }

  // Determine overall status
  const statuses = Object.values(checks).map((c) => c.status);
  let overall: HealthStatus = 'ok';
  if (statuses.some((s) => s === 'error')) {
    overall = 'error';
  } else if (statuses.some((s) => s === 'degraded')) {
    overall = 'degraded';
  }

  return {
    status: overall,
    checks,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };
}

/**
 * Built-in: memory health check.
 * Reports warning when heap usage exceeds threshold.
 */
export function memoryHealthCheck(threshold = 0.9): HealthCheckFn {
  return async () => {
    const usage = process.memoryUsage();
    const ratio = usage.heapUsed / usage.heapTotal;

    return {
      status: ratio < threshold ? 'ok' : 'degraded',
      message: `Heap: ${(ratio * 100).toFixed(1)}% used (${Math.round(usage.heapUsed / 1024 / 1024)}MB / ${Math.round(usage.heapTotal / 1024 / 1024)}MB)`,
    };
  };
}
