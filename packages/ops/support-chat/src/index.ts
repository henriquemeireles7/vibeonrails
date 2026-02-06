/**
 * @vibeonrails/support-chat
 *
 * AI support chat widget with SSE streaming, polling fallback,
 * session management, and ticket escalation.
 */

// Types
export type {
  ChatMessage,
  ChatMessageRole,
  ChatSession,
  ChatSessionStatus,
  SupportConfig,
  EscalationTicket,
  EscalationReason,
  SendMessageInput,
  SendMessageResponse,
  StreamChunk,
  ChatHandlerOptions,
  ChatWidgetProps,
} from "./types.js";

export {
  ChatMessageSchema,
  ChatMessageRoleSchema,
  ChatSessionSchema,
  ChatSessionStatusSchema,
  SupportConfigSchema,
  EscalationTicketSchema,
  EscalationReasonSchema,
  SendMessageInputSchema,
} from "./types.js";

// API
export {
  handleChatMessage,
  escalateToTicket,
  createSession,
  getSession,
  getSessionMessages,
  clearAllData,
} from "./api.js";

export type { EscalateOptions } from "./api.js";

// Widget
export { ChatWidget } from "./widget.js";

// Schema (Drizzle)
export { chatSessions, chatMessages, escalationTickets } from "./schema.js";

export type {
  ChatSessionRow,
  NewChatSessionRow,
  ChatMessageRow,
  NewChatMessageRow,
  EscalationTicketRow,
  NewEscalationTicketRow,
} from "./schema.js";
