# @vibeonrails/support-chat Skill

## Purpose

The `@vibeonrails/support-chat` package provides an AI-powered support chat widget with:

- **Types**: ChatMessage, ChatSession, SupportConfig, EscalationTicket with Zod schemas
- **API**: POST /api/support/chat endpoint with SSE streaming and polling fallback
- **Widget**: React component for chat UI with streaming display and escalation
- **Schema**: Drizzle ORM schema for chat_sessions and chat_messages tables

## Structure

```
packages/ops/support-chat/
├── src/
│   ├── types.ts             # Chat types with Zod schemas
│   ├── api.ts               # API endpoint handlers (SSE + polling)
│   ├── api.test.ts          # API tests
│   ├── widget.tsx           # React chat widget component
│   ├── widget.test.tsx      # Widget tests
│   ├── schema.ts            # Drizzle schema for chat tables
│   └── index.ts             # Barrel exports
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Patterns

### Sending a chat message

```typescript
import { handleChatMessage } from "@vibeonrails/support-chat";

const response = await handleChatMessage({
  sessionId: "session_123",
  message: "How do I reset my password?",
  aiProvider: myAIProvider,
  knowledgeBase: "/path/to/content/help",
});
```

### Using the widget

```tsx
import { ChatWidget } from "@vibeonrails/support-chat";

function App() {
  return (
    <ChatWidget
      endpoint="/api/support/chat"
      title="Need help?"
      placeholder="Ask a question..."
    />
  );
}
```

### Creating an escalation ticket

```typescript
import { escalateToTicket } from "@vibeonrails/support-chat";

const ticket = await escalateToTicket({
  sessionId: "session_123",
  reason: "User requested human support",
  messages: chatHistory,
});
```

## Architecture

- SSE (Server-Sent Events) for real-time AI streaming responses
- Automatic polling fallback when SSE fails (mobile Safari, HTTP/1.1 proxies)
- Chat history stored in database for context continuity
- AI prompt configurable via content/brand/support-prompt.md
- Escalation creates a support ticket and notifies the team

## Pitfalls

1. **SSE requires HTTP/2** for best performance. Polling fallback handles degraded environments.
2. **Chat sessions have TTL** -- expired sessions start fresh context.
3. **AI responses are non-deterministic** -- test structure, not content.
4. **Widget is React-only** -- server-side rendering requires hydration.
