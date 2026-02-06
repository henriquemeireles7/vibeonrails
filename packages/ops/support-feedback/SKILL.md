# @vibeonrails/support-feedback Skill

## Purpose

The `@vibeonrails/support-feedback` package provides an AI-powered feedback classification and task generation pipeline:

- **Types**: FeedbackInput, Classification categories, ClassificationResult with Zod schemas
- **Classifier**: AI classification against project context (roadmap, existing tasks)
- **Generator**: Creates task files for bugs/features, logs to JSONL, answers questions
- **CLI**: Summary and export commands for feedback data

## Structure

```
packages/ops/support-feedback/
├── src/
│   ├── types.ts              # Feedback types with Zod schemas
│   ├── classifier.ts         # AI feedback classifier
│   ├── classifier.test.ts    # Classifier tests
│   ├── generator.ts          # Task file generator
│   ├── generator.test.ts     # Generator tests
│   ├── cli.ts                # CLI commands (summary, export)
│   ├── cli.test.ts           # CLI tests
│   └── index.ts              # Barrel exports
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Patterns

### Classifying feedback

```typescript
import { classifyFeedback } from "@vibeonrails/support-feedback";

const result = await classifyFeedback({
  content: "The login page crashes on Safari",
  source: "chat",
  userId: "user_123",
  projectRoot: "/path/to/project",
  aiProvider: myAIProvider,
});
// result.classification === 'bug'
```

### Generating task files

```typescript
import { generateTaskFile } from "@vibeonrails/support-feedback";

await generateTaskFile({
  classification: result,
  projectRoot: "/path/to/project",
});
// Creates .plan/tasks/backlog/bug-login-safari-crash.md
```

## Classification Categories

- **bug** -- Creates `.plan/tasks/backlog/bug-{slug}.md`
- **feature-aligned** -- Creates `.plan/tasks/backlog/feat-{slug}.md`
- **feature-unaligned** -- Logs to `content/feedback/requests.jsonl`
- **question** -- Answers from knowledge base automatically
- **complaint** -- Escalates to human via notification

## Pitfalls

1. **Classification depends on project context** -- Ensure .plan/ROADMAP.md and .plan/CONTEXT.md exist.
2. **Slug generation must be deterministic** -- Same input should produce same slug for deduplication.
3. **JSONL files are append-only** -- Never overwrite, always append.
4. **AI classification is probabilistic** -- Include confidence scores for human review.
