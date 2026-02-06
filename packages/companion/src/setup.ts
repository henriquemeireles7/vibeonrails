/**
 * Companion Setup
 *
 * Implements `npx vibe companion setup discord` flow.
 * Checks OpenClaw, installs skills, configures channels, sets personality.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  type SetupOptions,
  type SetupResult,
  type CompanionConfig,
  type CompatibilityResult,
  type SkillMetadata,
  SKILL_NAMES,
  COMPANION_DEFAULTS,
  generateRandomName,
  setupOptionsSchema,
} from "./types.js";

/**
 * Parse skill frontmatter from a skill.md file.
 */
export function parseSkillMetadata(content: string): SkillMetadata {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new Error("Skill file missing frontmatter");
  }

  const fm = fmMatch[1]!;
  const lines = fm.split("\n");
  const data: Record<string, string | string[]> = {};
  let currentKey = "";
  let inArray = false;

  for (const line of lines) {
    if (line.startsWith("  - ")) {
      if (inArray && currentKey) {
        (data[currentKey] as string[]).push(line.replace("  - ", "").trim());
      }
      continue;
    }

    const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1]!;
      const value = kvMatch[2]!.trim().replace(/^["']|["']$/g, "");

      if (value === "") {
        data[key] = [];
        currentKey = key;
        inArray = true;
      } else {
        data[key] = value;
        inArray = false;
      }
    }
  }

  return {
    name: (data["name"] as string) ?? "unknown",
    description: (data["description"] as string) ?? "",
    version: (data["version"] as string) ?? "0.0.0",
    minOpenclawVersion: (data["min_openclaw_version"] as string) ?? "0.0.0",
    skillFormatVersion: (data["skill_format_version"] as string) ?? "1.0",
    author: (data["author"] as string) ?? "unknown",
    tags: Array.isArray(data["tags"]) ? data["tags"] : [],
  };
}

/**
 * Get the skills directory path (relative to the companion package).
 */
export function getSkillsDir(): string {
  const packageDir = join(new URL(".", import.meta.url).pathname, "..");
  return join(packageDir, COMPANION_DEFAULTS.skillsDir);
}

/**
 * Load all skill metadata from the skills directory.
 */
export function loadSkillMetadata(skillsDir: string): readonly SkillMetadata[] {
  const skills: SkillMetadata[] = [];

  for (const skillName of SKILL_NAMES) {
    const skillPath = join(skillsDir, skillName, "skill.md");
    if (existsSync(skillPath)) {
      const content = readFileSync(skillPath, "utf-8");
      skills.push(parseSkillMetadata(content));
    }
  }

  return skills;
}

/**
 * Check compatibility with an OpenClaw instance.
 */
export async function checkCompatibility(
  openclawUrl: string,
  skills: readonly SkillMetadata[],
): Promise<CompatibilityResult> {
  try {
    const response = await fetch(`${openclawUrl}/api/version`);
    if (!response.ok) {
      return {
        compatible: false,
        openclawVersion: "unknown",
        requiredVersion: skills[0]?.minOpenclawVersion ?? "0.5.0",
        skillFormatSupported: false,
        message: `OpenClaw instance returned status ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      version: string;
      skillFormat?: string;
    };
    const openclawVersion = data.version;

    // Simple semver check (major.minor comparison)
    const requiredVersion = skills[0]?.minOpenclawVersion ?? "0.5.0";
    const [reqMajor = 0, reqMinor = 0] = requiredVersion.split(".").map(Number);
    const [ocMajor = 0, ocMinor = 0] = openclawVersion.split(".").map(Number);

    const compatible =
      ocMajor > reqMajor || (ocMajor === reqMajor && ocMinor >= reqMinor);
    const skillFormatSupported = data.skillFormat === "1.0" || compatible;

    return {
      compatible,
      openclawVersion,
      requiredVersion,
      skillFormatSupported,
      message: compatible
        ? `OpenClaw ${openclawVersion} is compatible`
        : `OpenClaw ${openclawVersion} is below minimum required ${requiredVersion}. Please upgrade.`,
    };
  } catch {
    return {
      compatible: false,
      openclawVersion: "unreachable",
      requiredVersion: skills[0]?.minOpenclawVersion ?? "0.5.0",
      skillFormatSupported: false,
      message: `Cannot reach OpenClaw at ${openclawUrl}. Is it running?`,
    };
  }
}

/**
 * Install skills into an OpenClaw instance.
 */
export async function installSkills(
  openclawUrl: string,
  skillsDir: string,
): Promise<readonly string[]> {
  const installed: string[] = [];

  for (const skillName of SKILL_NAMES) {
    const skillPath = join(skillsDir, skillName, "skill.md");
    if (!existsSync(skillPath)) {
      continue;
    }

    const content = readFileSync(skillPath, "utf-8");

    try {
      const response = await fetch(`${openclawUrl}/api/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: skillName, content }),
      });

      if (response.ok) {
        installed.push(skillName);
      }
    } catch {
      // Skill install failed, continue with others
    }
  }

  return installed;
}

/**
 * Configure channels on the OpenClaw instance.
 */
export async function configureChannels(
  openclawUrl: string,
  platform: string,
  channelMapping: Record<string, string>,
): Promise<boolean> {
  try {
    const response = await fetch(`${openclawUrl}/api/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, mapping: channelMapping }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Set the companion personality on the OpenClaw instance.
 */
export async function setPersonality(
  openclawUrl: string,
  personalityContent: string,
  name: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${openclawUrl}/api/personality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personality: personalityContent, name }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test the companion connection with a hello message.
 */
export async function testConnection(openclawUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${openclawUrl}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Save companion config to .vibe/companion.json.
 */
export function saveConfig(projectRoot: string, config: CompanionConfig): void {
  const configPath = join(projectRoot, COMPANION_DEFAULTS.configFile);
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Load companion config from .vibe/companion.json.
 */
export function loadConfig(projectRoot: string): CompanionConfig | null {
  const configPath = join(projectRoot, COMPANION_DEFAULTS.configFile);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as CompanionConfig;
  } catch {
    return null;
  }
}

/**
 * Run the full companion setup flow.
 *
 * 1. Validate options
 * 2. Check OpenClaw reachability and compatibility
 * 3. Install skills
 * 4. Configure channels
 * 5. Set personality
 * 6. Name the companion
 * 7. Test connection
 * 8. Save config
 */
export async function setupCompanion(
  options: SetupOptions,
): Promise<SetupResult> {
  // Validate options
  const parsed = setupOptionsSchema.safeParse(options);
  if (!parsed.success) {
    return {
      success: false,
      name: options.name ?? "unknown",
      platform: options.platform,
      installedSkills: [],
      error: `Invalid options: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const companionName = options.name ?? generateRandomName();
  const personalityPath =
    options.personalityPath ?? COMPANION_DEFAULTS.personalityPath;

  // Load skill metadata
  const skillsDir = getSkillsDir();
  const skills = loadSkillMetadata(skillsDir);

  if (skills.length === 0) {
    return {
      success: false,
      name: companionName,
      platform: options.platform,
      installedSkills: [],
      error: "No skills found. Is @vibeonrails/companion installed correctly?",
    };
  }

  // Check compatibility
  const compat = await checkCompatibility(options.openclawUrl, skills);
  if (!compat.compatible) {
    return {
      success: false,
      name: companionName,
      platform: options.platform,
      installedSkills: [],
      error: compat.message,
    };
  }

  // Install skills
  const installedSkills = await installSkills(options.openclawUrl, skillsDir);

  // Configure channels
  const channelMapping =
    options.channelMapping ?? COMPANION_DEFAULTS.defaultChannelMapping;
  await configureChannels(
    options.openclawUrl,
    options.platform,
    channelMapping,
  );

  // Set personality
  const personalityFullPath = join(options.projectRoot, personalityPath);
  let personalityContent = "";
  if (existsSync(personalityFullPath)) {
    personalityContent = readFileSync(personalityFullPath, "utf-8");
  }
  await setPersonality(options.openclawUrl, personalityContent, companionName);

  // Test connection
  const connected = await testConnection(options.openclawUrl);

  // Save config
  const now = new Date().toISOString();
  const config: CompanionConfig = {
    platform: options.platform,
    openclawUrl: options.openclawUrl,
    name: companionName,
    personalityPath,
    installedSkills,
    channelMapping,
    createdAt: now,
    updatedAt: now,
  };

  saveConfig(options.projectRoot, config);

  return {
    success: connected && installedSkills.length > 0,
    name: companionName,
    platform: options.platform,
    installedSkills,
    error: connected ? undefined : "Setup completed but connection test failed",
  };
}
