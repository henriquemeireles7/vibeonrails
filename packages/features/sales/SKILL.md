# @vibeonrails/sales

## Purpose

Sales automation toolkit for Vibe on Rails applications. Configure AI-powered sales agents, define multi-channel outreach, and handle common sales actions like FAQ, qualification, demo booking, and handoff.

## Modules

### Config (`config.ts`)

- `SalesAgentConfig` - Define agent name, tone, channels, and qualification questions.
- `defineSalesAgent(config)` - Creates a validated sales agent configuration.

### Agent (`agent.ts`)

- `SalesAction` - Union type: `faq | qualify | book_demo | handoff`
- `handleSalesAction(action, context?)` - Stub handler for sales actions.

### Channels (`channels/`)

- `createWebchatChannel(config)` - Configure a web chat sales channel.
- `createWhatsAppChannel(config)` - Configure a WhatsApp sales channel.
- `createTelegramChannel(config)` - Configure a Telegram sales channel.

## Usage

```typescript
import {
  defineSalesAgent,
  handleSalesAction,
  createWebchatChannel,
} from "@vibeonrails/sales";

const agent = defineSalesAgent({
  name: "Sales Bot",
  tone: "friendly",
  channels: ["webchat", "whatsapp"],
  qualificationQuestions: ["What is your budget?", "What is your timeline?"],
});

const result = handleSalesAction("qualify");
```

## Notes

- All handlers are stubs. Implement real business logic for production.
- Channel configs hold credentials -- keep them in environment variables.
