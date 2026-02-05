/**
 * Health module barrel export
 */

export {
  registerHealthCheck,
  removeHealthCheck,
  runHealthChecks,
  memoryHealthCheck,
  type HealthStatus,
  type HealthCheckResult,
  type HealthReport,
} from './checks.js';
