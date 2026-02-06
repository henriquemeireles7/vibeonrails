# @vibeonrails/support

## Purpose

Customer support toolkit for Vibe on Rails applications. Provides a ticketing system, knowledge base article loader, live chat service, and a React chat widget placeholder.

## Modules

### Knowledge Base (`knowledge-base/loader.ts`)

- `loadArticle(path)` - Loads a markdown article, extracting frontmatter title and body content.

### Tickets (`tickets/`)

- Types: `TicketStatus`, `TicketPriority`, `Ticket`, `CreateTicketInput`, `UpdateTicketInput`
- Service: `createTicket`, `getTicket`, `listTickets`, `updateTicket`, `assignTicket`, `resolveTicket`, `closeTicket`
- Uses in-memory store. Replace with database-backed implementation for production.

### Chat (`chat/`)

- Types: `ChatMessage` (id, content, sender, timestamp)
- Service: `sendMessage`, `getMessages`, `clearChat`
- `ChatWidget` - React component placeholder for embedding a chat UI.

## Usage

```typescript
import {
  createTicket,
  sendMessage,
  loadArticle,
  ChatWidget,
} from "@vibeonrails/support";
```

## Notes

- In-memory stores are for development/prototyping. Wire to a real database for production.
- ChatWidget requires React 18+ or 19+ as a peer dependency.
