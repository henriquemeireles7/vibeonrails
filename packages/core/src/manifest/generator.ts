/**
 * Project Manifest Generator
 *
 * Auto-generates .vibe/project.json from project state.
 * Contains: installed modules, available commands, routes, config, content counts.
 * One read = full context for any AI agent.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { VibeConfig } from '../config/schema.js';

// ---------------------------------------------------------------------------
// Manifest Types
// ---------------------------------------------------------------------------

export interface ProjectManifest {
  /** Manifest version */
  version: 1;

  /** Project name from config */
  name: string;

  /** Project description */
  description: string;

  /** Installed modules */
  modules: Record<string, boolean>;

  /** Available commands */
  commands: string[];

  /** Detected routes (from src/modules/ controller files) */
  routes: string[];

  /** Configuration summary */
  config: {
    port: number;
    env: string;
    sitesMode: string;
    enabledSites: string[];
    analyticsServer: boolean;
    analyticsClient: boolean;
  };

  /** Content counts per directory */
  contentCounts: Record<string, number>;

  /** Connection status */
  connections: string[];

  /** Generation timestamp */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Content Counter
// ---------------------------------------------------------------------------

async function countContentFiles(
  baseDir: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  try {
    const entries = await readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = join(baseDir, entry.name);
        const files = await countFilesRecursive(dirPath);
        counts[entry.name] = files;
      }
    }
  } catch {
    // content/ directory doesn't exist — fine
  }

  return counts;
}

async function countFilesRecursive(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        count++;
      } else if (entry.isDirectory()) {
        count += await countFilesRecursive(join(dir, entry.name));
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return count;
}

// ---------------------------------------------------------------------------
// Route Scanner
// ---------------------------------------------------------------------------

async function scanRoutes(projectRoot: string): Promise<string[]> {
  const routes: string[] = [];
  const modulesDir = join(projectRoot, 'src', 'modules');

  try {
    const entries = await readdir(modulesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const controllerPath = join(
          modulesDir,
          entry.name,
          `${entry.name}.controller.ts`,
        );
        try {
          await stat(controllerPath);
          routes.push(`/api/${entry.name}`);
        } catch {
          // No controller file
        }
      }
    }
  } catch {
    // modules directory doesn't exist
  }

  return routes;
}

// ---------------------------------------------------------------------------
// Connection Scanner
// ---------------------------------------------------------------------------

async function scanConnections(projectRoot: string): Promise<string[]> {
  const connections: string[] = [];
  const credPath = join(projectRoot, '.vibe', 'credentials.json');

  try {
    const content = await readFile(credPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed.tokens) {
      connections.push(...Object.keys(parsed.tokens));
    }
  } catch {
    // No credentials file
  }

  return connections;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate the .vibe/project.json manifest.
 */
export async function generateManifest(
  config: VibeConfig,
  projectRoot?: string,
): Promise<ProjectManifest> {
  const root = projectRoot ?? process.cwd();

  // Scan project
  const [contentCounts, routes, connections] = await Promise.all([
    countContentFiles(join(root, 'content')),
    scanRoutes(root),
    scanConnections(root),
  ]);

  // Determine enabled sites
  const enabledSites: string[] = [];
  if (config.sites.blog.enabled) enabledSites.push('blog');
  if (config.sites.help.enabled) enabledSites.push('help');
  if (config.sites.landing.enabled) enabledSites.push('landing');
  if (config.sites.changelog.enabled) enabledSites.push('changelog');
  if (config.sites.status.enabled) enabledSites.push('status');

  // Available commands
  const commands = [
    'vibe dev',
    'vibe build',
    'vibe start',
    'vibe generate module <name>',
    'vibe generate component <name>',
    'vibe db migrate',
    'vibe db seed',
    'vibe db reset',
    'vibe db studio',
    'vibe add <module>',
    'vibe remove <module>',
    'vibe modules list',
    'vibe connect <provider>',
    'vibe connections list',
  ];

  if (config.modules.marketing) {
    commands.push('vibe marketing generate <channel>');
    commands.push('vibe marketing post <channel>');
  }
  if (config.modules.supportChat || config.modules.supportFeedback) {
    commands.push('vibe support tickets');
  }
  if (config.modules.finance) {
    commands.push('vibe finance mrr');
    commands.push('vibe finance report');
  }

  const manifest: ProjectManifest = {
    version: 1,
    name: config.name,
    description: config.description,
    modules: {
      marketing: config.modules.marketing,
      sales: config.modules.sales,
      supportChat: config.modules.supportChat,
      supportFeedback: config.modules.supportFeedback,
      finance: config.modules.finance,
      notifications: config.modules.notifications,
      search: config.modules.search,
      companion: config.modules.companion,
    },
    commands,
    routes,
    config: {
      port: config.port,
      env: config.env,
      sitesMode: config.sites.mode,
      enabledSites,
      analyticsServer: config.analytics.server,
      analyticsClient: config.analytics.client,
    },
    contentCounts,
    connections,
    generatedAt: new Date().toISOString(),
  };

  return manifest;
}

/**
 * Generate and write the manifest to .vibe/project.json.
 */
export async function writeManifest(
  config: VibeConfig,
  projectRoot?: string,
): Promise<ProjectManifest> {
  const root = projectRoot ?? process.cwd();
  const manifest = await generateManifest(config, root);

  const vibeDir = join(root, '.vibe');
  await mkdir(vibeDir, { recursive: true });
  await writeFile(
    join(vibeDir, 'project.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return manifest;
}
