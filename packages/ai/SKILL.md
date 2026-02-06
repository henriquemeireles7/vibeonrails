# @vibeonrails/ai Skill

## Purpose

Thin AI SDK for all AI operations across Vibe on Rails. Handles credentials, retries, streaming, and provider switching. Not a framework — a minimal abstraction that preserves provider-specific capabilities.

## Core Operations

- `chat()` — Conversational AI with streaming support
- `generateStructured()` — JSON output with Zod schema validation

## Deferred (V2.x)

- `embed()` — Vector embeddings (ships with pgvector support)

## Structure

```
packages/ai/
├── src/
│   ├── types.ts                        # AIProvider interface, config, capabilities map
│   ├── providers/
│   │   ├── anthropic.ts                # Anthropic Claude provider
│   │   ├── openai.ts                   # OpenAI provider
│   │   ├── ollama.ts                   # Ollama local provider
│   │   └── index.ts                    # Provider barrel exports
│   ├── index.ts                        # createAI() factory, barrel exports
│   └── *.test.ts                       # Colocated tests
├── SKILL.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Usage

```typescript
import { createAI } from '@vibeonrails/ai';

// Auto-detects provider from env vars (AI_PROVIDER, ANTHROPIC_API_KEY, etc.)
const ai = createAI();

// Chat with streaming
const stream = ai.chat({
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});

// Structured output with Zod validation
const result = await ai.generateStructured({
  prompt: 'Extract the user info',
  schema: UserSchema,
});

// Check provider capabilities
if (ai.supports('vision')) {
  // Use vision-specific features
}
```

## Patterns

### Adding a new provider

1. Create `src/providers/{name}.ts`
2. Implement `AIProvider` interface from `types.ts`
3. Define capabilities map (what the provider supports)
4. Export from `src/providers/index.ts`
5. Add to factory detection in `src/index.ts`

### Capabilities map

Providers declare what they support via a capabilities map:
- `vision` — Image understanding
- `toolUse` — Function/tool calling
- `streaming` — Streaming responses
- `structuredOutput` — JSON mode / structured output
- `systemPrompt` — System message support

Use `ai.supports('capability')` to check before using provider-specific features.

## Pitfalls

1. **No embed() in V2** — Deferred to V2.x with pgvector. Don't add it.
2. **No over-abstraction** — Keep the SDK thin. Don't build LangChain.
3. **Capabilities map** — Always check capabilities before using provider-specific features.
4. **Retry logic** — Built into each provider. Don't add external retry wrappers.
5. **Streaming protocol** — Uses async iterables, not custom event systems.
