// VOR: Companion first impression
// After setup, companion introduces itself in Discord with name, capabilities,
// and example commands.
// "Hey! I'm [name]. Try: 'what's my MRR?' or 'generate a tweet about [topic]'."

import type { OpenClawInstance } from "./provision.js";

/**
 * Companion personality configuration.
 * Read from content/brand/agent.md.
 */
export interface CompanionPersonality {
  /** User-chosen name for the companion */
  name: string;
  /** Brief personality description */
  personality: string;
  /** Channel to post the introduction */
  introChannel: string;
}

/**
 * First-run introduction message data.
 */
export interface IntroductionMessage {
  channel: string;
  message: string;
  exampleCommands: string[];
}

/**
 * Result of posting the first-run introduction.
 */
export interface FirstRunResult {
  posted: boolean;
  channel: string;
  companionName: string;
  error?: string;
}

/**
 * Options for the first run setup.
 */
export interface FirstRunOptions {
  instance: OpenClawInstance;
  personality: CompanionPersonality;
  installedSkills: string[];
  fetcher?: (url: string, init?: RequestInit) => Promise<{ ok: boolean }>;
}

// ---------------------------------------------------------------------------
// Random name generation (when user does not pick a name)
// ---------------------------------------------------------------------------

const RANDOM_ADJECTIVES = [
  "swift",
  "clever",
  "bright",
  "cosmic",
  "zen",
  "radiant",
  "stellar",
  "nimble",
  "serene",
  "bold",
];

const RANDOM_NOUNS = [
  "fox",
  "owl",
  "hawk",
  "wolf",
  "lynx",
  "sage",
  "echo",
  "spark",
  "drift",
  "pulse",
];

/**
 * Generate a random companion name.
 */
export function generateRandomName(): string {
  const adj =
    RANDOM_ADJECTIVES[Math.floor(Math.random() * RANDOM_ADJECTIVES.length)];
  const noun = RANDOM_NOUNS[Math.floor(Math.random() * RANDOM_NOUNS.length)];
  return `${adj}-${noun}`;
}

// ---------------------------------------------------------------------------
// Skill-to-capability mapping
// ---------------------------------------------------------------------------

function getCapabilitiesFromSkills(skills: string[]): string[] {
  const capabilities: string[] = [];

  const skillMap: Record<string, string> = {
    "vibe-project": "run VoR CLI commands",
    "vibe-marketing": "manage marketing content and social posts",
    "vibe-support": "triage support tickets",
    "vibe-finance": "report revenue and financial metrics",
    "vibe-analytics": "query analytics data",
    "vibe-x402": "monitor x402 payment revenue",
    "vibe-periodic": "run scheduled tasks (weekly reports, daily content)",
  };

  for (const skill of skills) {
    const capability = skillMap[skill];
    if (capability) {
      capabilities.push(capability);
    }
  }

  return capabilities;
}

function getExampleCommands(skills: string[]): string[] {
  const examples: string[] = [];

  if (skills.includes("vibe-finance")) {
    examples.push("what's my MRR?");
  }
  if (skills.includes("vibe-marketing")) {
    examples.push("generate a tweet about [topic]");
  }
  if (skills.includes("vibe-support")) {
    examples.push("summarize open tickets");
  }
  if (skills.includes("vibe-analytics")) {
    examples.push("how many users signed up this week?");
  }
  if (skills.includes("vibe-x402")) {
    examples.push("what's my x402 revenue?");
  }
  if (skills.includes("vibe-project")) {
    examples.push("run vibe status");
  }

  // Always include at least one example
  if (examples.length === 0) {
    examples.push("run vibe status");
  }

  return examples;
}

// ---------------------------------------------------------------------------
// Introduction Message
// ---------------------------------------------------------------------------

/**
 * Build the first-run introduction message.
 */
export function buildIntroduction(
  personality: CompanionPersonality,
  installedSkills: string[],
): IntroductionMessage {
  const capabilities = getCapabilitiesFromSkills(installedSkills);
  const examples = getExampleCommands(installedSkills);

  const capabilitiesText =
    capabilities.length > 0
      ? `I can ${capabilities.join(", ")}.`
      : "I'm ready to help you manage your project.";

  const examplesText = examples.map((ex) => `  - "${ex}"`).join("\n");

  const message = [
    `Hey! I'm ${personality.name}. ${personality.personality}`,
    "",
    capabilitiesText,
    "",
    "Try these commands:",
    examplesText,
    "",
    "I'm here to help run your business. Just ask!",
  ].join("\n");

  return {
    channel: personality.introChannel,
    message,
    exampleCommands: examples,
  };
}

// ---------------------------------------------------------------------------
// Post Introduction
// ---------------------------------------------------------------------------

/**
 * Post the first-run introduction to the companion's Discord channel.
 */
export async function postFirstRunIntroduction(
  options: FirstRunOptions,
): Promise<FirstRunResult> {
  const { instance, personality, installedSkills, fetcher } = options;
  const fetchFn = fetcher ?? (globalThis.fetch as unknown as typeof fetcher);

  const intro = buildIntroduction(personality, installedSkills);

  try {
    const response = await fetchFn!(`${instance.url}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: intro.channel,
        message: intro.message,
      }),
    });

    if (!response.ok) {
      return {
        posted: false,
        channel: intro.channel,
        companionName: personality.name,
        error: "Failed to post introduction message",
      };
    }

    return {
      posted: true,
      channel: intro.channel,
      companionName: personality.name,
    };
  } catch {
    return {
      posted: false,
      channel: intro.channel,
      companionName: personality.name,
      error: "Could not reach OpenClaw instance",
    };
  }
}
