import { describe, it, expect } from 'vitest';
import { validateEnvironment, type EnvVarDefinition } from './validator.js';

const testDefs: EnvVarDefinition[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'Database URL',
    hint: 'Set DATABASE_URL',
    autoFixable: false,
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'JWT Secret',
    hint: 'Generate a secret',
    validate: (v) => (v.length < 32 ? 'Too short' : null),
    autoFixable: true,
  },
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis URL',
    hint: 'docker run redis',
    autoFixable: false,
  },
];

describe('Environment Validator', () => {
  it('should pass when all required vars are set', () => {
    const report = validateEnvironment(
      {
        DATABASE_URL: 'postgres://localhost/test',
        JWT_SECRET: 'a'.repeat(32),
        REDIS_URL: 'redis://localhost',
      },
      testDefs,
    );

    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('should report error for missing required var', () => {
    const report = validateEnvironment(
      {
        JWT_SECRET: 'a'.repeat(32),
      },
      testDefs,
    );

    expect(report.valid).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].name).toBe('DATABASE_URL');
    expect(report.errors[0].hint).toBe('Set DATABASE_URL');
  });

  it('should report warning for missing optional var', () => {
    const report = validateEnvironment(
      {
        DATABASE_URL: 'postgres://localhost/test',
        JWT_SECRET: 'a'.repeat(32),
      },
      testDefs,
    );

    expect(report.valid).toBe(true);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0].name).toBe('REDIS_URL');
    expect(report.warnings[0].severity).toBe('warning');
  });

  it('should validate custom rules', () => {
    const report = validateEnvironment(
      {
        DATABASE_URL: 'postgres://localhost/test',
        JWT_SECRET: 'short',
      },
      testDefs,
    );

    expect(report.valid).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].name).toBe('JWT_SECRET');
    expect(report.errors[0].message).toBe('Too short');
    expect(report.errors[0].autoFixable).toBe(true);
  });

  it('should handle empty string as missing', () => {
    const report = validateEnvironment(
      {
        DATABASE_URL: '',
        JWT_SECRET: 'a'.repeat(32),
      },
      testDefs,
    );

    expect(report.valid).toBe(false);
    expect(report.errors[0].name).toBe('DATABASE_URL');
  });

  it('should report all errors, not just first', () => {
    const report = validateEnvironment({}, testDefs);

    expect(report.errors).toHaveLength(2);
    expect(report.errors.map((e) => e.name)).toContain('DATABASE_URL');
    expect(report.errors.map((e) => e.name)).toContain('JWT_SECRET');
  });
});
