# @vibeonrails/marketing Skill

## Purpose

The `@vibeonrails/marketing` package implements an autonomous content pipeline with three stages:

- **Heuristics**: Content primitives (clients, products, hooks, stories, concepts, branding, CTAs) stored as markdown files with structured frontmatter
- **Transformation**: AI-powered content generation from heuristics + channel prompts
- **Channels**: Post content via platform APIs (Twitter, Bluesky), manage drafts/posted lifecycle

## Structure

```
packages/ops/marketing/
├── src/
│   ├── heuristics/
│   │   ├── types.ts             # 7 heuristic types with Zod schemas
│   │   ├── loader.ts            # Load, filter, validate heuristics from filesystem
│   │   ├── loader.test.ts       # Loader tests
│   │   ├── cli.ts               # CLI commands (list, create)
│   │   ├── cli.test.ts          # CLI tests
│   │   └── index.ts             # Barrel exports
│   ├── transform/
│   │   ├── types.ts             # Channel prompt, transform input/output types
│   │   ├── engine.ts            # AI-powered content transformation
│   │   ├── engine.test.ts       # Engine tests
│   │   ├── cli.ts               # CLI commands (generate)
│   │   ├── cli.test.ts          # CLI tests
│   │   └── index.ts             # Barrel exports
│   ├── channels/
│   │   ├── types.ts             # Channel, PostResult, metadata types
│   │   ├── engine.ts            # Post content, manage lifecycle
│   │   ├── engine.test.ts       # Engine tests
│   │   ├── cli.ts               # CLI commands (post, autopilot, schedule, drafts, posted, stats)
│   │   ├── cli.test.ts          # CLI tests
│   │   └── index.ts             # Barrel exports
│   └── index.ts                 # Main barrel export
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Patterns

### Loading heuristics

```typescript
import {
  loadHeuristics,
  loadHeuristicsByType,
} from "@vibeonrails/marketing/heuristics";

// Load all heuristics from content directory
const all = await loadHeuristics("/path/to/content/marketing/heuristics");

// Filter by type
const hooks = await loadHeuristicsByType(
  "/path/to/content/marketing/heuristics",
  "hook",
);
```

### Generating content

```typescript
import { transformContent } from "@vibeonrails/marketing/transform";

const result = await transformContent({
  channel: "twitter",
  heuristics: { hook: myHook, client: myClient, product: myProduct },
  promptPath: "/path/to/content/marketing/transform/prompts/twitter.md",
  aiProvider: myAIProvider, // from @vibeonrails/ai
});
```

### Posting content

```typescript
import { postContent, listDrafts } from "@vibeonrails/marketing/channels";

// List drafts for a channel
const drafts = await listDrafts(
  "/path/to/content/marketing/channels/twitter/drafts",
);

// Post content
const result = await postContent({
  channel: "twitter",
  filePath: "/path/to/draft.md",
  integration: twitterIntegration, // from @vibeonrails/core/integrations
});
```

## Content Directory Layout

```
content/marketing/
├── heuristics/
│   ├── clients/          # ICP definitions
│   ├── products/         # Solution definitions
│   ├── hooks/            # Attention-catching phrases
│   ├── stories/          # Relatable narratives
│   ├── concepts/         # Fundamental ideas
│   ├── branding/         # Tone of voice, style
│   └── ctas/             # Calls to action
├── transform/
│   └── prompts/
│       ├── twitter.md    # Twitter format prompt
│       └── bluesky.md    # Bluesky format prompt
└── channels/
    ├── twitter/
    │   ├── drafts/       # Generated, pending review
    │   └── posted/       # Published content
    └── bluesky/
        ├── drafts/
        └── posted/
```

## Pitfalls

1. **Heuristics are mutable** — Users iterate on them. Git provides version history. Generated content records the git hash of each heuristic used.
2. **AI content is non-deterministic** — Test structure (frontmatter fields, character limits), not content quality.
3. **Channel posting moves files** — Drafts move to posted/ after successful posting. Always check file existence before operating.
4. **Autopilot mode skips review** — Use with caution. Default flow sends to Discord for human approval.
