/**
 * Heuristics — Types
 *
 * Defines all 7 heuristic types used in the marketing content pipeline.
 * Each heuristic is a markdown file with structured frontmatter.
 *
 * Types: client, product, hook, story, concept, branding, cta
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Heuristic Type Enum
// ---------------------------------------------------------------------------

export const HEURISTIC_TYPES = [
  "client",
  "product",
  "hook",
  "story",
  "concept",
  "branding",
  "cta",
] as const;

export type HeuristicType = (typeof HEURISTIC_TYPES)[number];

export const HeuristicTypeSchema = z.enum(HEURISTIC_TYPES);

// ---------------------------------------------------------------------------
// Base Heuristic Frontmatter
// ---------------------------------------------------------------------------

export const BaseHeuristicSchema = z.object({
  /** Unique identifier (derived from filename if not set) */
  id: z.string().min(1),

  /** Human-readable title */
  title: z.string().min(1),

  /** Heuristic type */
  type: HeuristicTypeSchema,

  /** Tags for filtering */
  tags: z.array(z.string()).default([]),

  /** Whether this heuristic is active */
  active: z.boolean().default(true),

  /** Creation date (ISO string) */
  createdAt: z.string().optional(),

  /** Last modified date (ISO string) */
  updatedAt: z.string().optional(),
});

export type BaseHeuristic = z.infer<typeof BaseHeuristicSchema>;

// ---------------------------------------------------------------------------
// Client Heuristic (ICP definition)
// ---------------------------------------------------------------------------

export const ClientHeuristicSchema = BaseHeuristicSchema.extend({
  type: z.literal("client"),

  /** Target audience segment name */
  segment: z.string().min(1),

  /** Primary desires of the client */
  desires: z.array(z.string()).min(1),

  /** Problems the client faces */
  problems: z.array(z.string()).min(1),

  /** Pain budget — how much pain they tolerate before acting */
  painBudget: z.enum(["low", "medium", "high"]).default("medium"),

  /** Where they spend time online */
  channels: z.array(z.string()).default([]),
});

export type ClientHeuristic = z.infer<typeof ClientHeuristicSchema>;

// ---------------------------------------------------------------------------
// Product Heuristic (Solution definition)
// ---------------------------------------------------------------------------

export const ProductHeuristicSchema = BaseHeuristicSchema.extend({
  type: z.literal("product"),

  /** Unique Selling Proposition */
  usp: z.string().min(1),

  /** Methodology or approach name */
  methodology: z.string().optional(),

  /** The "aha moment" for users */
  ahaMoment: z.string().optional(),

  /** Key features list */
  features: z.array(z.string()).default([]),

  /** Target client heuristic IDs */
  targetClients: z.array(z.string()).default([]),
});

export type ProductHeuristic = z.infer<typeof ProductHeuristicSchema>;

// ---------------------------------------------------------------------------
// Hook Heuristic (Attention-catching phrase)
// ---------------------------------------------------------------------------

export const HookHeuristicSchema = BaseHeuristicSchema.extend({
  type: z.literal("hook"),

  /** Hook format: question, statement, statistic, story-opener */
  format: z
    .enum(["question", "statement", "statistic", "story-opener"])
    .default("statement"),

  /** Target emotion to trigger */
  emotion: z.string().optional(),

  /** Character count limit for the hook */
  maxLength: z.number().int().positive().optional(),
});

export type HookHeuristic = z.infer<typeof HookHeuristicSchema>;

// ---------------------------------------------------------------------------
// Story Heuristic (Relatable narrative)
// ---------------------------------------------------------------------------

export const StoryHeuristicSchema = BaseHeuristicSchema.extend({
  type: z.literal("story"),

  /** Story arc type */
  arc: z
    .enum(["before-after", "struggle-triumph", "discovery", "transformation"])
    .default("before-after"),

  /** Protagonist type (founder, customer, user, team) */
  protagonist: z
    .enum(["founder", "customer", "user", "team"])
    .default("founder"),

  /** Lesson or takeaway */
  lesson: z.string().optional(),
});

export type StoryHeuristic = z.infer<typeof StoryHeuristicSchema>;

// ---------------------------------------------------------------------------
// Concept Heuristic (Fundamental idea)
// ---------------------------------------------------------------------------

export const ConceptHeuristicSchema = BaseHeuristicSchema.extend({
  type: z.literal("concept"),

  /** The core thesis in one sentence */
  thesis: z.string().min(1),

  /** Common objections to the concept */
  objections: z.array(z.string()).default([]),

  /** Counter-arguments to objections */
  counterArguments: z.array(z.string()).default([]),

  /** Related concept IDs */
  relatedConcepts: z.array(z.string()).default([]),
});

export type ConceptHeuristic = z.infer<typeof ConceptHeuristicSchema>;

// ---------------------------------------------------------------------------
// Branding Heuristic (Tone of voice, style)
// ---------------------------------------------------------------------------

export const BrandingHeuristicSchema = BaseHeuristicSchema.extend({
  type: z.literal("branding"),

  /** Tone keywords (e.g., "professional", "casual", "bold") */
  tone: z.array(z.string()).min(1),

  /** Words to always use */
  vocabulary: z.array(z.string()).default([]),

  /** Words to never use */
  blacklist: z.array(z.string()).default([]),

  /** Writing style guidelines */
  style: z
    .enum(["formal", "casual", "technical", "conversational"])
    .default("conversational"),

  /** Emoji usage */
  emojis: z
    .enum(["never", "minimal", "moderate", "frequent"])
    .default("minimal"),
});

export type BrandingHeuristic = z.infer<typeof BrandingHeuristicSchema>;

// ---------------------------------------------------------------------------
// CTA Heuristic (Call to action)
// ---------------------------------------------------------------------------

export const CTAHeuristicSchema = BaseHeuristicSchema.extend({
  type: z.literal("cta"),

  /** The desired action */
  action: z.string().min(1),

  /** URL or destination */
  url: z.string().optional(),

  /** Urgency level */
  urgency: z.enum(["low", "medium", "high"]).default("medium"),

  /** CTA text template */
  template: z.string().optional(),
});

export type CTAHeuristic = z.infer<typeof CTAHeuristicSchema>;

// ---------------------------------------------------------------------------
// Union Types
// ---------------------------------------------------------------------------

export const HeuristicFrontmatterSchema = z.discriminatedUnion("type", [
  ClientHeuristicSchema,
  ProductHeuristicSchema,
  HookHeuristicSchema,
  StoryHeuristicSchema,
  ConceptHeuristicSchema,
  BrandingHeuristicSchema,
  CTAHeuristicSchema,
]);

export type HeuristicFrontmatter = z.infer<typeof HeuristicFrontmatterSchema>;

// ---------------------------------------------------------------------------
// Schema Map (for runtime lookup by type)
// ---------------------------------------------------------------------------

export const HEURISTIC_SCHEMA_MAP: Record<HeuristicType, z.ZodType> = {
  client: ClientHeuristicSchema,
  product: ProductHeuristicSchema,
  hook: HookHeuristicSchema,
  story: StoryHeuristicSchema,
  concept: ConceptHeuristicSchema,
  branding: BrandingHeuristicSchema,
  cta: CTAHeuristicSchema,
};

// ---------------------------------------------------------------------------
// Loaded Heuristic (frontmatter + body)
// ---------------------------------------------------------------------------

export interface LoadedHeuristic<
  T extends HeuristicFrontmatter = HeuristicFrontmatter,
> {
  /** Parsed and validated frontmatter */
  frontmatter: T;

  /** Markdown body content (below frontmatter) */
  body: string;

  /** File path relative to heuristics root */
  filePath: string;

  /** Absolute file path */
  absolutePath: string;

  /** Git hash of the file (for tracking in generated content) */
  gitHash: string | null;
}

// ---------------------------------------------------------------------------
// Heuristic Templates (for CLI create)
// ---------------------------------------------------------------------------

export const HEURISTIC_TEMPLATES: Record<HeuristicType, string> = {
  client: `---
id: "{id}"
title: "{title}"
type: client
segment: ""
desires:
  - ""
problems:
  - ""
painBudget: medium
channels: []
tags: []
active: true
---

# {title}

Describe your ideal customer profile here. Include demographics,
psychographics, and behavioral patterns.
`,

  product: `---
id: "{id}"
title: "{title}"
type: product
usp: ""
methodology: ""
ahaMoment: ""
features: []
targetClients: []
tags: []
active: true
---

# {title}

Describe your product or service. Focus on the transformation
it provides, not just features.
`,

  hook: `---
id: "{id}"
title: "{title}"
type: hook
format: statement
emotion: ""
tags: []
active: true
---

# {title}

Write your attention-catching phrase here. Make it specific,
surprising, or provocative.
`,

  story: `---
id: "{id}"
title: "{title}"
type: story
arc: before-after
protagonist: founder
lesson: ""
tags: []
active: true
---

# {title}

Tell a relatable narrative. Use specific details, emotions,
and a clear transformation arc.
`,

  concept: `---
id: "{id}"
title: "{title}"
type: concept
thesis: ""
objections: []
counterArguments: []
relatedConcepts: []
tags: []
active: true
---

# {title}

Explain your core idea. Address objections proactively.
Make it memorable and shareable.
`,

  branding: `---
id: "{id}"
title: "{title}"
type: branding
tone:
  - "conversational"
vocabulary: []
blacklist: []
style: conversational
emojis: minimal
tags: []
active: true
---

# {title}

Define your brand voice. Include examples of how you write,
preferred phrases, and things to avoid.
`,

  cta: `---
id: "{id}"
title: "{title}"
type: cta
action: ""
url: ""
urgency: medium
template: ""
tags: []
active: true
---

# {title}

Define the desired action and the motivation behind it.
Include context for when this CTA should be used.
`,
};
