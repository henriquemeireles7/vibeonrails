/**
 * Module Registry
 *
 * Defines all available VoR modules, their packages, file structures,
 * route registrations, and dependencies.
 */

import { join } from "node:path";

/**
 * Module definition in the registry.
 */
export interface ModuleDefinition {
  readonly name: string;
  readonly package: string;
  readonly description: string;
  readonly category: "ops" | "features" | "sites" | "infra";
  readonly dependencies: readonly string[];
  readonly peerDependencies: readonly string[];
  readonly files: readonly ModuleFile[];
  readonly routes: readonly RouteRegistration[];
  readonly configEntries: readonly ConfigEntry[];
  readonly contentDirs: readonly string[];
  readonly postInstallSteps: readonly string[];
}

/**
 * A file created by module installation.
 */
export interface ModuleFile {
  readonly path: string;
  readonly template: string;
  readonly description: string;
}

/**
 * A route registration to add to the router.
 */
export interface RouteRegistration {
  readonly path: string;
  readonly import: string;
  readonly method: "use" | "get" | "post" | "put" | "delete";
}

/**
 * A configuration entry to add to vibe.config.ts.
 */
export interface ConfigEntry {
  readonly key: string;
  readonly value: string;
  readonly description: string;
}

/**
 * Module manifest for tracking installed modules.
 * Stored in .vibe/modules.json.
 */
export interface ModuleManifest {
  readonly version: string;
  readonly modules: Record<string, InstalledModule>;
}

/**
 * Record of an installed module.
 */
export interface InstalledModule {
  readonly name: string;
  readonly package: string;
  readonly installedAt: string;
  readonly files: readonly InstalledFile[];
}

/**
 * A file installed by a module with its checksum.
 */
export interface InstalledFile {
  readonly path: string;
  readonly checksum: string;
}

// --- Templates ---

const TWITTER_PROMPT_TEMPLATE = `---
channel: twitter
max_length: 280
---

Write a tweet for the audience described in the client heuristic.
Use the hook to grab attention.
Reference the product naturally.
Include a clear CTA.
Stay under 280 characters.
`;

const BLUESKY_PROMPT_TEMPLATE = `---
channel: bluesky
max_length: 300
---

Write a Bluesky post for the audience described in the client heuristic.
Use the hook to grab attention.
Reference the product naturally.
Include a clear CTA.
Stay under 300 characters.
`;

const SUPPORT_PROMPT_TEMPLATE = `---
role: support-agent
---

You are a helpful support agent. Answer questions using the help center knowledge base.
If you cannot answer a question, offer to create a support ticket.
Be concise, professional, and empathetic.
`;

const SALES_SKILL_TEMPLATE = `# Sales Module

## Purpose
CRM with contacts, deals, and outreach sequences.

## Patterns
- Contacts: CRUD operations with stage management (lead, qualified, customer, churned)
- Deals: Pipeline management with stages (discovery, proposal, negotiation, closed)
- Outreach: Email sequences with personalization from marketing heuristics
`;

const PAYMENTS_SKILL_TEMPLATE = `# Payments Module

## Purpose
Stripe checkout, subscriptions, and webhook handling.

## Patterns
- Checkout: Create sessions, handle success/cancel callbacks
- Subscriptions: Create, update, cancel with proration
- Webhooks: Verify signatures, handle events idempotently
`;

const AGENT_PERSONALITY_TEMPLATE = `# Companion Personality

You are a business operations assistant.

## Communication Style
- Professional but approachable
- Action-oriented with specific next steps
- Data-driven with numbers when available
- Proactive about flagging issues

## Responsibilities
1. Marketing: Generate and review content
2. Support: Triage tickets, summarize feedback
3. Finance: Report metrics, track costs
4. Analytics: Answer data questions
5. Operations: Run CLI commands, monitor health
`;

/**
 * The complete module registry.
 */
export const MODULE_REGISTRY: readonly ModuleDefinition[] = [
  {
    name: "marketing",
    package: "@vibeonrails/marketing",
    description:
      "Content pipeline — heuristics, AI generation, channel posting",
    category: "ops",
    dependencies: ["@vibeonrails/marketing"],
    peerDependencies: ["@vibeonrails/ai"],
    files: [
      {
        path: "content/marketing/heuristics/.gitkeep",
        template: "",
        description: "Heuristics directory",
      },
      {
        path: "content/marketing/transform/prompts/twitter.md",
        template: TWITTER_PROMPT_TEMPLATE,
        description: "Twitter channel prompt",
      },
      {
        path: "content/marketing/transform/prompts/bluesky.md",
        template: BLUESKY_PROMPT_TEMPLATE,
        description: "Bluesky channel prompt",
      },
      {
        path: "content/marketing/channels/twitter/drafts/.gitkeep",
        template: "",
        description: "Twitter drafts directory",
      },
      {
        path: "content/marketing/channels/twitter/posted/.gitkeep",
        template: "",
        description: "Twitter posted directory",
      },
      {
        path: "content/marketing/channels/bluesky/drafts/.gitkeep",
        template: "",
        description: "Bluesky drafts directory",
      },
      {
        path: "content/marketing/channels/bluesky/posted/.gitkeep",
        template: "",
        description: "Bluesky posted directory",
      },
    ],
    routes: [],
    configEntries: [
      {
        key: "marketing.channels",
        value: "['twitter', 'bluesky']",
        description: "Enabled marketing channels",
      },
    ],
    contentDirs: ["content/marketing"],
    postInstallSteps: [
      "Create heuristics: npx vibe marketing heuristics create hook my-first-hook",
      "Connect Twitter: npx vibe connect twitter",
      "Generate content: npx vibe marketing generate twitter",
    ],
  },
  {
    name: "sales",
    package: "@vibeonrails/sales",
    description: "CRM with contacts, deals, and outreach sequences",
    category: "ops",
    dependencies: ["@vibeonrails/sales"],
    peerDependencies: [],
    files: [
      {
        path: "src/modules/sales/SKILL.md",
        template: SALES_SKILL_TEMPLATE,
        description: "Sales module skill file",
      },
    ],
    routes: [
      {
        path: "/api/sales",
        import: "@vibeonrails/sales",
        method: "use",
      },
    ],
    configEntries: [],
    contentDirs: [],
    postInstallSteps: [
      'Add contacts: npx vibe sales contacts add --name "..." --email "..."',
      "Import contacts: npx vibe sales contacts import contacts.csv",
    ],
  },
  {
    name: "support-chat",
    package: "@vibeonrails/support-chat",
    description: "AI-powered support chat widget with SSE streaming",
    category: "ops",
    dependencies: ["@vibeonrails/support-chat"],
    peerDependencies: ["@vibeonrails/ai"],
    files: [
      {
        path: "content/brand/support-prompt.md",
        template: SUPPORT_PROMPT_TEMPLATE,
        description: "Support AI prompt configuration",
      },
    ],
    routes: [
      {
        path: "/api/support/chat",
        import: "@vibeonrails/support-chat",
        method: "use",
      },
    ],
    configEntries: [],
    contentDirs: ["content/brand"],
    postInstallSteps: [
      "Edit support prompt: content/brand/support-prompt.md",
      'Add widget to your app: import { SupportChat } from "@vibeonrails/support-chat"',
    ],
  },
  {
    name: "support-feedback",
    package: "@vibeonrails/support-feedback",
    description: "User feedback pipeline — collect, classify, create tasks",
    category: "ops",
    dependencies: ["@vibeonrails/support-feedback"],
    peerDependencies: [],
    files: [
      {
        path: "content/feedback/.gitkeep",
        template: "",
        description: "Feedback directory",
      },
      {
        path: ".plan/tasks/backlog/.gitkeep",
        template: "",
        description: "Task backlog directory",
      },
    ],
    routes: [
      {
        path: "/api/feedback",
        import: "@vibeonrails/support-feedback",
        method: "use",
      },
    ],
    configEntries: [],
    contentDirs: ["content/feedback", ".plan/tasks/backlog"],
    postInstallSteps: [
      "View feedback: npx vibe support feedback summary --last 7d",
    ],
  },
  {
    name: "finance",
    package: "@vibeonrails/finance",
    description: "Financial reporting — MRR, churn, LTV, invoicing",
    category: "ops",
    dependencies: ["@vibeonrails/finance"],
    peerDependencies: [],
    files: [],
    routes: [],
    configEntries: [
      {
        key: "finance.stripeKey",
        value: "process.env.STRIPE_SECRET_KEY ?? ''",
        description: "Stripe API key for revenue metrics",
      },
    ],
    contentDirs: [],
    postInstallSteps: [
      "Connect Stripe: npx vibe connect stripe",
      "Check MRR: npx vibe finance mrr",
    ],
  },
  {
    name: "notifications",
    package: "@vibeonrails/notifications",
    description: "Multi-channel notifications — email, in-app, push, Discord",
    category: "ops",
    dependencies: ["@vibeonrails/notifications"],
    peerDependencies: [],
    files: [],
    routes: [],
    configEntries: [],
    contentDirs: [],
    postInstallSteps: ["Configure channels in vibe.config.ts"],
  },
  {
    name: "payments",
    package: "@vibeonrails/payments",
    description: "Stripe checkout, subscriptions, and webhooks",
    category: "features",
    dependencies: ["@vibeonrails/payments"],
    peerDependencies: [],
    files: [
      {
        path: "src/modules/payments/SKILL.md",
        template: PAYMENTS_SKILL_TEMPLATE,
        description: "Payments module skill file",
      },
    ],
    routes: [
      {
        path: "/api/payments",
        import: "@vibeonrails/payments",
        method: "use",
      },
    ],
    configEntries: [],
    contentDirs: [],
    postInstallSteps: [
      "Set STRIPE_SECRET_KEY in .env",
      "Set STRIPE_WEBHOOK_SECRET in .env",
    ],
  },
  {
    name: "admin",
    package: "@vibeonrails/admin",
    description: "Auto-generated CRUD admin panel",
    category: "features",
    dependencies: ["@vibeonrails/admin"],
    peerDependencies: [],
    files: [],
    routes: [
      {
        path: "/admin",
        import: "@vibeonrails/admin",
        method: "use",
      },
    ],
    configEntries: [],
    contentDirs: [],
    postInstallSteps: ["Access admin panel at /admin"],
  },
  {
    name: "companion",
    package: "@vibeonrails/companion",
    description: "OpenClaw skills for autonomous business operations",
    category: "ops",
    dependencies: ["@vibeonrails/companion"],
    peerDependencies: [],
    files: [
      {
        path: "content/brand/agent.md",
        template: AGENT_PERSONALITY_TEMPLATE,
        description: "Companion personality configuration",
      },
    ],
    routes: [],
    configEntries: [],
    contentDirs: ["content/brand"],
    postInstallSteps: [
      "Setup companion: npx vibe companion setup discord",
      "Edit personality: content/brand/agent.md",
    ],
  },
] as const;

/**
 * Lookup a module by name.
 */
export function getModule(name: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.name === name);
}

/**
 * Get all modules in a category.
 */
export function getModulesByCategory(
  category: ModuleDefinition["category"],
): readonly ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => m.category === category);
}

/**
 * Resolve all dependencies for a module (including transitive).
 */
export function resolveDependencies(moduleName: string): readonly string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function resolve(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);

    const mod = getModule(name);
    if (!mod) return;

    // Resolve peer dependencies first
    for (const peer of mod.peerDependencies) {
      const peerMod = MODULE_REGISTRY.find((m) => m.package === peer);
      if (peerMod) {
        resolve(peerMod.name);
      }
    }

    result.push(name);
  }

  resolve(moduleName);
  return result;
}

/**
 * Generate the file manifest for a module.
 */
export function generateFileManifest(
  moduleName: string,
  projectRoot: string,
): readonly string[] {
  const mod = getModule(moduleName);
  if (!mod) return [];

  return mod.files.map((f) => join(projectRoot, f.path));
}
