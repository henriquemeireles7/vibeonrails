import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerHealthCheck,
  removeHealthCheck,
  runHealthChecks,
  memoryHealthCheck,
} from './checks.js';

beforeEach(() => {
  // Clean up registry between tests by removing known checks
  removeHealthCheck('test-ok');
  removeHealthCheck('test-error');
  removeHealthCheck('test-degraded');
  removeHealthCheck('memory');
});

describe('registerHealthCheck', () => {
  it('should register a health check', async () => {
    registerHealthCheck('test-ok', async () => ({ status: 'ok' }));
    const report = await runHealthChecks();

    expect(report.checks['test-ok']).toBeDefined();
    expect(report.checks['test-ok'].status).toBe('ok');
  });
});

describe('runHealthChecks', () => {
  it('should return ok when all checks pass', async () => {
    registerHealthCheck('test-ok', async () => ({ status: 'ok' }));
    const report = await runHealthChecks();

    expect(report.status).toBe('ok');
    expect(report.timestamp).toBeDefined();
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('should return error when any check fails', async () => {
    registerHealthCheck('test-ok', async () => ({ status: 'ok' }));
    registerHealthCheck('test-error', async () => ({ status: 'error', message: 'DB down' }));
    const report = await runHealthChecks();

    expect(report.status).toBe('error');
  });

  it('should return degraded when a check is degraded', async () => {
    registerHealthCheck('test-ok', async () => ({ status: 'ok' }));
    registerHealthCheck('test-degraded', async () => ({ status: 'degraded' }));
    const report = await runHealthChecks();

    expect(report.status).toBe('degraded');
  });

  it('should catch check exceptions and report as error', async () => {
    registerHealthCheck('test-error', async () => {
      throw new Error('Connection refused');
    });
    const report = await runHealthChecks();

    expect(report.status).toBe('error');
    expect(report.checks['test-error'].message).toBe('Connection refused');
  });

  it('should include latency for each check', async () => {
    registerHealthCheck('test-ok', async () => ({ status: 'ok' }));
    const report = await runHealthChecks();

    expect(report.checks['test-ok'].latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('memoryHealthCheck', () => {
  it('should report memory status', async () => {
    const check = memoryHealthCheck();
    const result = await check();

    expect(['ok', 'degraded']).toContain(result.status);
    expect(result.message).toContain('Heap:');
  });
});
