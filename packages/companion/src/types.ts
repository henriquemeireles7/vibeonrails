/**
 * Companion Types
 *
 * Types for the OpenClaw companion setup, configuration, and status.
 */

import { z } from "zod";

/**
 * Supported platforms for companion deployment.
 */
export type CompanionPlatform = "discord";

/**
 * Skill metadata parsed from frontmatter.
 */
export interface SkillMetadata {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly minOpenclawVersion: string;
  readonly skillFormatVersion: string;
  readonly author: string;
  readonly tags: readonly string[];
}

/**
 * Companion configuration stored in .vibe/companion.json.
 */
export interface CompanionConfig {
  readonly platform: CompanionPlatform;
  readonly openclawUrl: string;
  readonly name: string;
  readonly personalityPath: string;
  readonly installedSkills: readonly string[];
  readonly channelMapping: Record<string, string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Status of a running companion.
 */
export interface CompanionStatus {
  readonly connected: boolean;
  readonly name: string;
  readonly platform: CompanionPlatform;
  readonly openclawUrl: string;
  readonly skills: readonly string[];
  readonly uptime: number;
  readonly lastActivity: string | null;
}

/**
 * Options for companion setup flow.
 */
export interface SetupOptions {
  readonly platform: CompanionPlatform;
  readonly openclawUrl: string;
  readonly projectRoot: string;
  readonly name?: string;
  readonly personalityPath?: string;
  readonly channelMapping?: Record<string, string>;
}

/**
 * Result of a setup operation.
 */
export interface SetupResult {
  readonly success: boolean;
  readonly name: string;
  readonly platform: CompanionPlatform;
  readonly installedSkills: readonly string[];
  readonly error?: string;
}

/**
 * Compatibility check result.
 */
export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly openclawVersion: string;
  readonly requiredVersion: string;
  readonly skillFormatSupported: boolean;
  readonly message: string;
}

/**
 * Available skill names.
 */
export const SKILL_NAMES = [
  "vibe-project",
  "vibe-marketing",
  "vibe-support",
  "vibe-finance",
  "vibe-analytics",
] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

/**
 * Zod schema for companion config validation.
 */
export const companionConfigSchema = z.object({
  platform: z.literal("discord"),
  openclawUrl: z.string().url(),
  name: z.string().min(1).max(50),
  personalityPath: z.string(),
  installedSkills: z.array(z.string()),
  channelMapping: z.record(z.string(), z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Zod schema for setup options validation.
 */
export const setupOptionsSchema = z.object({
  platform: z.literal("discord"),
  openclawUrl: z.string().url(),
  projectRoot: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  personalityPath: z.string().optional(),
  channelMapping: z.record(z.string(), z.string()).optional(),
});

/**
 * Default companion configuration values.
 */
export const COMPANION_DEFAULTS = {
  personalityPath: "content/brand/agent.md",
  configFile: ".vibe/companion.json",
  skillsDir: "skills",
  defaultChannelMapping: {
    "content-review": "content-review",
    "support-alerts": "support-alerts",
    "finance-reports": "finance-reports",
    analytics: "analytics",
  },
} as const;

/**
 * Random name generator for unnamed companions.
 */
const ADJECTIVES = [
  "swift",
  "bright",
  "calm",
  "deft",
  "keen",
  "bold",
  "fair",
  "wise",
  "warm",
  "sure",
] as const;

const NOUNS = [
  "falcon",
  "harbor",
  "beacon",
  "summit",
  "bridge",
  "anvil",
  "prism",
  "atlas",
  "scout",
  "forge",
] as const;

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]!;
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]!;
  return `${adj}-${noun}`;
}
