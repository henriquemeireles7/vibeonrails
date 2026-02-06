# @vibeonrails/test-utils Skill

## Purpose

Shared test utilities for the VoR ecosystem. Provides HTTP fixture recording,
content fixture helpers, database test setup, and mock factories.

## Structure

```
packages/test-utils/
├── src/
│   ├── fixtures.ts           # HTTP fixture recording and playback
│   ├── content.ts            # Content/markdown test helpers
│   ├── mocks.ts              # Mock factories for common types
│   ├── assertions.ts         # Custom test assertions
│   └── index.ts              # Barrel exports
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Patterns

### Creating mock content files

```typescript
import { createTempContent, createMarkdownFile } from "@vibeonrails/test-utils";

const dir = await createTempContent({
  "blog/post-1.md": { title: "Hello", content: "# World" },
  "help/getting-started.md": { title: "Setup", content: "# Guide" },
});
```

### Using mock factories

```typescript
import { mockUser, mockPost, mockConfig } from "@vibeonrails/test-utils";

const user = mockUser({ email: "test@example.com" });
const post = mockPost({ authorId: user.id });
```

## Pitfalls

1. **Temp directories must be cleaned up** — Always use afterEach hooks.
2. **HTTP fixtures are deterministic** — Record once, replay forever.
3. **Mock factories return readonly types** — Spread if mutation needed.
