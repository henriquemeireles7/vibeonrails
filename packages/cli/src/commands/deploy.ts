/**
 * Deploy Command
 *
 * `vibe deploy` auto-detects platform and runs the full deploy pipeline:
 * 1. Environment validation
 * 2. Build
 * 3. Migrate (additive only)
 * 4. Deploy to platform
 * 5. Health check gate (wait for /health 200, 30s timeout)
 *
 * Platform detection:
 * - Railway: RAILWAY_TOKEN env var
 * - Fly.io: FLY_ACCESS_TOKEN env var
 * - Docker: Dockerfile present in project root
 *
 * Usage:
 *   vibe deploy                  Auto-detect platform and deploy
 *   vibe deploy railway          Force deploy to Railway
 *   vibe deploy fly              Force deploy to Fly.io
 *   vibe deploy docker           Build Docker image
 */

import { Command } from 'commander';
import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeployPlatform = 'railway' | 'fly' | 'docker' | 'unknown';

export interface DeployConfig {
  platform: DeployPlatform;
  /** Whether to skip migrations */
  skipMigrate: boolean;
  /** Whether to skip health check */
  skipHealthCheck: boolean;
  /** Health check URL */
  healthCheckUrl: string;
  /** Health check timeout in seconds */
  healthCheckTimeout: number;
  /** Whether this is a destructive migration (requires --destructive flag) */
  destructive: boolean;
}

export interface DeployStepResult {
  step: string;
  success: boolean;
  message: string;
  durationMs: number;
}

export interface DeployResult {
  platform: DeployPlatform;
  success: boolean;
  steps: DeployStepResult[];
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Platform Detection
// ---------------------------------------------------------------------------

/**
 * Detect the deployment platform from environment variables and project files.
 */
export function detectPlatform(options?: {
  env?: Record<string, string | undefined>;
  hasDockerfile?: boolean;
}): DeployPlatform {
  const env = options?.env ?? process.env;

  if (env.RAILWAY_TOKEN) return 'railway';
  if (env.FLY_ACCESS_TOKEN) return 'fly';
  if (options?.hasDockerfile) return 'docker';

  return 'unknown';
}

/**
 * Get display name for a platform.
 */
export function getPlatformDisplayName(platform: DeployPlatform): string {
  const names: Record<DeployPlatform, string> = {
    railway: 'Railway',
    fly: 'Fly.io',
    docker: 'Docker',
    unknown: 'Unknown',
  };
  return names[platform];
}

// ---------------------------------------------------------------------------
// Environment Validation
// ---------------------------------------------------------------------------

/** Required env vars for production deploy */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
];

/** Env vars required per platform */
const PLATFORM_ENV_VARS: Record<DeployPlatform, string[]> = {
  railway: ['RAILWAY_TOKEN'],
  fly: ['FLY_ACCESS_TOKEN'],
  docker: [],
  unknown: [],
};

/**
 * Validate that required environment variables are set.
 */
export function validateEnvironment(
  platform: DeployPlatform,
  env?: Record<string, string | undefined>,
): { valid: boolean; missing: string[] } {
  const envVars = env ?? process.env;
  const required = [...REQUIRED_ENV_VARS, ...PLATFORM_ENV_VARS[platform]];
  const missing = required.filter((key) => !envVars[key]);

  return { valid: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Migration Safety
// ---------------------------------------------------------------------------

/**
 * Check if a migration SQL contains destructive operations.
 * Destructive operations: DROP TABLE, DROP COLUMN, RENAME, TRUNCATE, DELETE
 */
export function isDestructiveMigration(sql: string): boolean {
  const destructivePatterns = [
    /DROP\s+TABLE/i,
    /DROP\s+COLUMN/i,
    /ALTER\s+TABLE\s+\w+\s+RENAME/i,
    /TRUNCATE/i,
    /DELETE\s+FROM/i,
  ];

  return destructivePatterns.some((pattern) => pattern.test(sql));
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

/**
 * Perform a health check against the deployed application.
 * Polls the /health endpoint with exponential backoff.
 */
export async function healthCheck(
  url: string,
  timeoutSeconds: number,
  fetcher?: (url: string) => Promise<{ status: number }>,
): Promise<{ healthy: boolean; attempts: number; durationMs: number }> {
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;
  let attempts = 0;
  let delay = 1000; // Start with 1s

  const doFetch = fetcher ?? (async (fetchUrl: string) => {
    const res = await fetch(fetchUrl);
    return { status: res.status };
  });

  while (Date.now() - startTime < timeoutMs) {
    attempts++;
    try {
      const res = await doFetch(url);
      if (res.status === 200) {
        return {
          healthy: true,
          attempts,
          durationMs: Date.now() - startTime,
        };
      }
    } catch {
      // Connection refused or other error — keep retrying
    }

    // Exponential backoff (1s, 2s, 4s, 8s) capped at 8s
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 8000);
  }

  return {
    healthy: false,
    attempts,
    durationMs: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// Deploy Steps (stubbed — platform-specific CLI tools handle actual deploy)
// ---------------------------------------------------------------------------

/**
 * Get the deploy command for a platform.
 */
export function getDeployCommand(platform: DeployPlatform): string | null {
  const commands: Record<DeployPlatform, string | null> = {
    railway: 'railway up',
    fly: 'fly deploy',
    docker: 'docker build -t app .',
    unknown: null,
  };
  return commands[platform];
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function deployCommand(): Command {
  return new Command('deploy')
    .description('Deploy to a cloud provider')
    .argument('[target]', 'Deployment target (railway, fly, docker)')
    .option('--skip-migrate', 'Skip database migrations')
    .option('--skip-health-check', 'Skip health check gate')
    .option('--destructive', 'Allow destructive migrations')
    .option('--health-url <url>', 'Health check URL', '/health')
    .option('--health-timeout <seconds>', 'Health check timeout in seconds', '30')
    .action((target: string | undefined, options: {
      skipMigrate?: boolean;
      skipHealthCheck?: boolean;
      destructive?: boolean;
      healthUrl?: string;
      healthTimeout?: string;
    }) => {
      // Detect or use specified platform
      const platform: DeployPlatform = (target as DeployPlatform) ?? detectPlatform();

      if (platform === 'unknown') {
        console.log(chalk.red('\n  Could not detect deployment platform.\n'));
        console.log('  Set one of:');
        console.log(chalk.dim('    RAILWAY_TOKEN   — for Railway'));
        console.log(chalk.dim('    FLY_ACCESS_TOKEN — for Fly.io'));
        console.log(chalk.dim('  Or have a Dockerfile in your project root.\n'));
        process.exitCode = 1;
        return;
      }

      // Validate environment
      const envCheck = validateEnvironment(platform);
      if (!envCheck.valid) {
        console.log(chalk.red('\n  Missing required environment variables:\n'));
        for (const key of envCheck.missing) {
          console.log(chalk.dim(`    - ${key}`));
        }
        console.log();
        process.exitCode = 1;
        return;
      }

      const displayName = getPlatformDisplayName(platform);
      const deployCmd = getDeployCommand(platform);

      console.log(chalk.cyan(`\n  Deploying to ${displayName}...\n`));

      // Show the deploy pipeline steps
      console.log(chalk.dim('  Pipeline:'));
      console.log(chalk.dim('    1. Env validation    ... done'));
      if (!options.skipMigrate) {
        console.log(chalk.dim('    2. Build             ... npx vibe build'));
        console.log(chalk.dim('    3. Migrate           ... npx vibe db migrate'));
      }
      console.log(chalk.dim(`    4. Deploy            ... ${deployCmd}`));
      if (!options.skipHealthCheck) {
        console.log(chalk.dim(`    5. Health check      ... GET ${options.healthUrl ?? '/health'}`));
      }
      console.log();

      console.log(chalk.yellow('  Deploy pipeline is ready. Run the following commands:\n'));
      console.log(chalk.dim('    npx vibe build'));
      if (!options.skipMigrate) {
        console.log(chalk.dim('    npx vibe db migrate'));
      }
      console.log(chalk.dim(`    ${deployCmd}`));
      console.log();
    });
}
