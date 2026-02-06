/**
 * Companion CLI Commands
 *
 * Implements `npx vibe companion status`, `npx vibe companion config`,
 * and `npx vibe companion logs`.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./setup.js";
import { type CompanionStatus, COMPANION_DEFAULTS } from "./types.js";

/**
 * Get the status of the companion.
 * Reads config and checks OpenClaw health.
 */
export async function getCompanionStatus(options: {
  readonly openclawUrl?: string;
  readonly projectRoot: string;
}): Promise<CompanionStatus> {
  const config = loadConfig(options.projectRoot);

  if (!config) {
    return {
      connected: false,
      name: "not-configured",
      platform: "discord",
      openclawUrl: options.openclawUrl ?? "unknown",
      skills: [],
      uptime: 0,
      lastActivity: null,
    };
  }

  const url = options.openclawUrl ?? config.openclawUrl;

  try {
    const response = await fetch(`${url}/api/health`);
    if (!response.ok) {
      return {
        connected: false,
        name: config.name,
        platform: config.platform,
        openclawUrl: url,
        skills: config.installedSkills,
        uptime: 0,
        lastActivity: null,
      };
    }

    const data = (await response.json()) as {
      uptime?: number;
      lastActivity?: string;
    };

    return {
      connected: true,
      name: config.name,
      platform: config.platform,
      openclawUrl: url,
      skills: config.installedSkills,
      uptime: data.uptime ?? 0,
      lastActivity: data.lastActivity ?? null,
    };
  } catch {
    return {
      connected: false,
      name: config.name,
      platform: config.platform,
      openclawUrl: url,
      skills: config.installedSkills,
      uptime: 0,
      lastActivity: null,
    };
  }
}

/**
 * Get the companion configuration.
 */
export function getCompanionConfig(projectRoot: string): {
  readonly configured: boolean;
  readonly config: ReturnType<typeof loadConfig>;
  readonly personalityExists: boolean;
} {
  const config = loadConfig(projectRoot);
  const personalityPath =
    config?.personalityPath ?? COMPANION_DEFAULTS.personalityPath;
  const personalityExists = existsSync(join(projectRoot, personalityPath));

  return {
    configured: config !== null,
    config,
    personalityExists,
  };
}

/**
 * Get companion logs from OpenClaw.
 */
export async function getCompanionLogs(options: {
  readonly openclawUrl?: string;
  readonly projectRoot: string;
  readonly limit?: number;
}): Promise<{
  readonly logs: readonly string[];
  readonly error?: string;
}> {
  const config = loadConfig(options.projectRoot);
  const url = options.openclawUrl ?? config?.openclawUrl;

  if (!url) {
    return {
      logs: [],
      error:
        "Companion not configured. Run `npx vibe companion setup discord` first.",
    };
  }

  try {
    const limit = options.limit ?? 50;
    const response = await fetch(`${url}/api/logs?limit=${limit}`);

    if (!response.ok) {
      return {
        logs: [],
        error: `Failed to fetch logs: HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as { logs: string[] };
    return { logs: data.logs };
  } catch {
    return {
      logs: [],
      error: `Cannot reach OpenClaw at ${url}`,
    };
  }
}

/**
 * Format status for CLI display.
 */
export function formatStatus(status: CompanionStatus): string {
  const lines: string[] = [];

  lines.push(`Companion: ${status.name}`);
  lines.push(`Platform: ${status.platform}`);
  lines.push(`Status: ${status.connected ? "Connected" : "Disconnected"}`);
  lines.push(`OpenClaw: ${status.openclawUrl}`);

  if (status.connected) {
    const hours = Math.floor(status.uptime / 3600);
    const minutes = Math.floor((status.uptime % 3600) / 60);
    lines.push(`Uptime: ${hours}h ${minutes}m`);

    if (status.lastActivity) {
      lines.push(`Last activity: ${status.lastActivity}`);
    }
  }

  if (status.skills.length > 0) {
    lines.push(`Skills: ${status.skills.join(", ")}`);
  }

  return lines.join("\n");
}
