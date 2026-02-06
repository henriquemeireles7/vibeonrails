/**
 * Environment Validator
 *
 * Validates all env vars at startup before the server starts.
 * Uses the error catalog for all messages.
 * Missing required vars show clear instructions, not stack traces.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface EnvValidationResult {
  name: string;
  severity: ValidationSeverity;
  message: string;
  hint?: string;
  autoFixable: boolean;
}

export interface EnvValidationReport {
  valid: boolean;
  results: EnvValidationResult[];
  errors: EnvValidationResult[];
  warnings: EnvValidationResult[];
}

// ---------------------------------------------------------------------------
// Environment Variable Definitions
// ---------------------------------------------------------------------------

export interface EnvVarDefinition {
  name: string;
  required: boolean;
  description: string;
  hint: string;
  validate?: (value: string) => string | null; // returns error message or null
  autoFixable: boolean;
}

const ENV_DEFINITIONS: EnvVarDefinition[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    hint: 'Options: (1) Get free DB at neon.tech (2) docker compose up -d (3) Paste your URL',
    autoFixable: false,
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret for JWT token signing (min 32 characters)',
    hint: 'Generate one: openssl rand -base64 48 | tr -d "\\n"',
    validate: (value: string) => {
      if (value.length < 32) {
        return 'JWT_SECRET must be at least 32 characters. Run: openssl rand -base64 48';
      }
      return null;
    },
    autoFixable: true,
  },
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis connection string (optional — enables caching, queues, rate limiting)',
    hint: 'docker run -d -p 6379:6379 redis',
    autoFixable: false,
  },
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for email sending',
    hint: 'Get one at resend.com/api-keys',
    autoFixable: false,
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key for payments',
    hint: 'Get one at dashboard.stripe.com/apikeys',
    autoFixable: false,
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key for AI features',
    hint: 'Get one at console.anthropic.com',
    autoFixable: false,
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key (alternative to Anthropic)',
    hint: 'Get one at platform.openai.com',
    autoFixable: false,
  },
];

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate all environment variables.
 * Returns a report with errors and warnings.
 */
export function validateEnvironment(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  definitions: EnvVarDefinition[] = ENV_DEFINITIONS,
): EnvValidationReport {
  const results: EnvValidationResult[] = [];

  for (const def of definitions) {
    const value = env[def.name];

    if (!value || value.trim() === '') {
      if (def.required) {
        results.push({
          name: def.name,
          severity: 'error',
          message: `Missing required environment variable: ${def.name}`,
          hint: def.hint,
          autoFixable: def.autoFixable,
        });
      } else {
        results.push({
          name: def.name,
          severity: 'warning',
          message: `Optional variable not set: ${def.name} (${def.description})`,
          hint: def.hint,
          autoFixable: false,
        });
      }
      continue;
    }

    // Run custom validation
    if (def.validate) {
      const error = def.validate(value);
      if (error) {
        results.push({
          name: def.name,
          severity: 'error',
          message: error,
          hint: def.hint,
          autoFixable: def.autoFixable,
        });
        continue;
      }
    }

    // Valid
    results.push({
      name: def.name,
      severity: 'info',
      message: `${def.name} - set`,
      autoFixable: false,
    });
  }

  const errors = results.filter((r) => r.severity === 'error');
  const warnings = results.filter((r) => r.severity === 'warning');

  return {
    valid: errors.length === 0,
    results,
    errors,
    warnings,
  };
}

/**
 * Get the default environment variable definitions.
 * Useful for extending with custom definitions.
 */
export function getDefaultEnvDefinitions(): EnvVarDefinition[] {
  return [...ENV_DEFINITIONS];
}
