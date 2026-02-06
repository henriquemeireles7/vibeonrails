# @vibeonrails/ops Skill

## Purpose

Meta-package that re-exports all VoR business operations sub-packages. Install one package to get access to the full operations suite.

## Sub-Packages

| Package                         | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `@vibeonrails/marketing`        | Content machine — heuristics, transformation, channel posting |
| `@vibeonrails/sales`            | Minimal CRM — contacts, deals, AI qualification, outreach     |
| `@vibeonrails/support-chat`     | AI support chat widget with SSE streaming                     |
| `@vibeonrails/support-feedback` | Feedback classification and task generation pipeline          |
| `@vibeonrails/finance`          | Financial reporting — revenue, costs, invoicing               |
| `@vibeonrails/notifications`    | Multi-channel notifications with digest batching              |

## Usage

```typescript
// Install everything at once
import { marketing, sales, finance } from "@vibeonrails/ops";

// Or install individual packages
import { createSalesService } from "@vibeonrails/sales";
import { createReportAggregator } from "@vibeonrails/finance";
```

## Structure

```
packages/ops/
├── src/
│   └── index.ts          # Re-exports all sub-packages
├── marketing/             # @vibeonrails/marketing
├── sales/                 # @vibeonrails/sales
├── support-chat/          # @vibeonrails/support-chat
├── support-feedback/      # @vibeonrails/support-feedback
├── finance/               # @vibeonrails/finance
├── notifications/         # @vibeonrails/notifications
├── SKILL.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Pitfalls

1. **Not all sub-packages need to be used** — Tree-shaking removes unused modules.
2. **Sub-packages have their own peer dependencies** — Check each sub-package's package.json.
3. **The meta-package has no code of its own** — It only re-exports.
