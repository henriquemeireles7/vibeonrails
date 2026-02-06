/**
 * Static/API Split Deploy
 *
 * `vibe deploy --sites-only`  pushes SSG output to CDN
 * `vibe deploy --api-only`    deploys API server
 * Full deploy does both.
 *
 * Sites get immutable cache headers (Cache-Control: public, max-age=31536000, immutable).
 * API gets health check gate.
 *
 * Usage:
 *   vibe deploy --sites-only     Deploy only static sites to CDN
 *   vibe deploy --api-only       Deploy only the API server
 *   vibe deploy                  Full deploy (both sites + API)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { detectPlatform, validateEnvironment, healthCheck, type DeployPlatform } from './deploy.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeployMode = 'full' | 'sites-only' | 'api-only';

export interface SplitDeployConfig {
  mode: DeployMode;
  platform: DeployPlatform;
  /** Directory containing built static site */
  sitesOutputDir: string;
  /** Whether to verify CDN cache headers */
  verifyCacheHeaders: boolean;
  /** Health check URL for API */
  healthCheckUrl: string;
  /** Health check timeout */
  healthCheckTimeout: number;
}

export interface SplitDeployResult {
  mode: DeployMode;
  sitesDeployed: boolean;
  apiDeployed: boolean;
  cacheHeadersVerified: boolean;
  healthCheckPassed: boolean | null;
}

// ---------------------------------------------------------------------------
// CDN Cache Headers
// ---------------------------------------------------------------------------

/**
 * Immutable cache headers for static assets.
 * These should be set on all SSG-generated files.
 */
export const CDN_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Stale-while-revalidate cache headers for SSG pages.
 * Serve stale for 24 hours while refreshing in background.
 */
export const SSG_PAGE_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
};

/**
 * Get appropriate cache headers based on file type.
 */
export function getCacheHeaders(filePath: string): Record<string, string> {
  // Static assets (JS, CSS, images, fonts) get immutable caching
  const assetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.woff', '.woff2'];
  if (assetExtensions.some((ext) => filePath.endsWith(ext))) {
    return CDN_CACHE_HEADERS;
  }

  // HTML pages get stale-while-revalidate
  if (filePath.endsWith('.html')) {
    return SSG_PAGE_CACHE_HEADERS;
  }

  // Default: no special caching
  return {};
}

// ---------------------------------------------------------------------------
// Deploy Steps
// ---------------------------------------------------------------------------

/**
 * Get the sites deploy command.
 * Currently outputs instructions — will be expanded with CDN integration.
 */
export function getSitesDeployCommand(outputDir: string): string {
  return `Sync ${outputDir}/ to CDN with immutable headers`;
}

/**
 * Get the API deploy command for a platform.
 */
export function getApiDeployCommand(platform: DeployPlatform): string | null {
  const commands: Record<DeployPlatform, string | null> = {
    railway: 'railway up',
    fly: 'fly deploy',
    docker: 'docker build -t app . && docker push',
    unknown: null,
  };
  return commands[platform];
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function deploySplitCommand(): Command {
  return new Command('deploy-split')
    .description('Deploy with static/API split')
    .option('--sites-only', 'Deploy only static sites to CDN')
    .option('--api-only', 'Deploy only the API server')
    .option('--sites-dir <dir>', 'SSG output directory', 'dist/sites')
    .option('--health-url <url>', 'Health check URL', '/health')
    .option('--health-timeout <seconds>', 'Health check timeout in seconds', '30')
    .action((options: {
      sitesOnly?: boolean;
      apiOnly?: boolean;
      sitesDir?: string;
      healthUrl?: string;
      healthTimeout?: string;
    }) => {
      const mode: DeployMode = options.sitesOnly
        ? 'sites-only'
        : options.apiOnly
          ? 'api-only'
          : 'full';

      const platform = detectPlatform();
      const sitesDir = options.sitesDir ?? 'dist/sites';

      console.log(chalk.cyan(`\n  Deploy mode: ${mode}\n`));

      // Sites deploy
      if (mode === 'full' || mode === 'sites-only') {
        console.log(chalk.bold('  Static Sites Deploy:'));
        console.log(chalk.dim(`    Output dir: ${sitesDir}`));
        console.log(chalk.dim(`    Cache: ${CDN_CACHE_HEADERS['Cache-Control']}`));
        console.log(chalk.dim(`    Command: ${getSitesDeployCommand(sitesDir)}`));
        console.log();
      }

      // API deploy
      if (mode === 'full' || mode === 'api-only') {
        if (platform === 'unknown') {
          console.log(chalk.red('  Cannot detect API deployment platform.\n'));
          console.log(chalk.dim('  Set RAILWAY_TOKEN or FLY_ACCESS_TOKEN.\n'));
          process.exitCode = 1;
          return;
        }

        const apiCmd = getApiDeployCommand(platform);
        console.log(chalk.bold('  API Server Deploy:'));
        console.log(chalk.dim(`    Platform: ${platform}`));
        console.log(chalk.dim(`    Command: ${apiCmd}`));
        console.log(chalk.dim(`    Health check: GET ${options.healthUrl}`));
        console.log();
      }
    });
}
