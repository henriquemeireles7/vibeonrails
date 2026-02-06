/**
 * Support Chat — Types
 *
 * Defines ChatMessage, ChatSession, SupportConfig, and EscalationTicket
 * types for the AI support chat widget.
 *
 * Architecture:
 * - SSE streaming for real-time AI responses
 * - Polling fallback for degraded environments
 * - Session-based chat history for context continuity
 * - Escalation to human support via ticket creation
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Chat Message
// ---------------------------------------------------------------------------

export const ChatMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

export const ChatMessageSchema = z.object({
  /** Unique message identifier */
  id: z.string().min(1),

  /** Chat session this message belongs to */
  sessionId: z.string().min(1),

  /** Who sent the message */
  role: ChatMessageRoleSchema,

  /** Message content (plain text) */
  content: z.string().min(1),

  /** Creation timestamp (ISO string) */
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ---------------------------------------------------------------------------
// Chat Session
// ---------------------------------------------------------------------------

export const ChatSessionStatusSchema = z.enum([
  "active",
  "escalated",
  "resolved",
  "expired",
]);
export type ChatSessionStatus = z.infer<typeof ChatSessionStatusSchema>;

export const ChatSessionSchema = z.object({
  /** Unique session identifier */
  id: z.string().min(1),

  /** Optional user identifier (null for anonymous) */
  userId: z.string().nullable().default(null),

  /** Current session status */
  status: ChatSessionStatusSchema.default("active"),

  /** Session creation timestamp (ISO string) */
  createdAt: z.string(),

  /** Last activity timestamp (ISO string) */
  updatedAt: z.string(),

  /** Session expiry timestamp (ISO string, null for no expiry) */
  expiresAt: z.string().nullable().default(null),

  /** Number of messages in the session */
  messageCount: z.number().int().nonnegative().default(0),

  /** Custom metadata */
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

// ---------------------------------------------------------------------------
// Support Config
// ---------------------------------------------------------------------------

export const SupportConfigSchema = z.object({
  /** API endpoint base URL for the chat */
  endpoint: z.string().default("/api/support/chat"),

  /** Path to the AI system prompt file */
  systemPromptPath: z.string().default("content/brand/support-prompt.md"),

  /** Path to the knowledge base content */
  knowledgeBasePath: z.string().default("content/help"),

  /** Session TTL in seconds (default: 24 hours) */
  sessionTtlSeconds: z.number().int().positive().default(86400),

  /** Maximum messages per session before escalation prompt */
  maxMessagesBeforeEscalation: z.number().int().positive().default(20),

  /** Whether to enable SSE streaming (with polling fallback) */
  enableStreaming: z.boolean().default(true),

  /** Polling interval in ms when SSE is unavailable */
  pollingIntervalMs: z.number().int().positive().default(1000),

  /** Maximum response tokens for AI */
  maxResponseTokens: z.number().int().positive().default(1024),

  /** AI model temperature */
  temperature: z.number().min(0).max(2).default(0.7),
});

export type SupportConfig = z.infer<typeof SupportConfigSchema>;

// ---------------------------------------------------------------------------
// Escalation Ticket
// ---------------------------------------------------------------------------

export const EscalationReasonSchema = z.enum([
  "user_requested",
  "max_messages_reached",
  "ai_unable_to_answer",
  "sensitive_topic",
]);
export type EscalationReason = z.infer<typeof EscalationReasonSchema>;

export const EscalationTicketSchema = z.object({
  /** Unique ticket identifier */
  id: z.string().min(1),

  /** Chat session that triggered the escalation */
  sessionId: z.string().min(1),

  /** Reason for escalation */
  reason: EscalationReasonSchema,

  /** AI-generated summary of the conversation */
  summary: z.string(),

  /** User ID if available */
  userId: z.string().nullable().default(null),

  /** Ticket priority (based on conversation analysis) */
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),

  /** Ticket status */
  status: z.enum(["open", "assigned", "resolved", "closed"]).default("open"),

  /** Creation timestamp (ISO string) */
  createdAt: z.string(),
});

export type EscalationTicket = z.infer<typeof EscalationTicketSchema>;

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

export const SendMessageInputSchema = z.object({
  /** Session ID (created if not provided) */
  sessionId: z.string().optional(),

  /** User message content */
  message: z.string().min(1),

  /** User ID (optional, for authenticated users) */
  userId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export interface SendMessageResponse {
  /** Session ID (created or existing) */
  sessionId: string;

  /** The user message that was stored */
  userMessage: ChatMessage;

  /** The AI response message */
  assistantMessage: ChatMessage;

  /** Whether the session was escalated */
  escalated: boolean;

  /** Escalation ticket if created */
  ticket?: EscalationTicket;
}

export interface StreamChunk {
  /** Chunk content */
  content: string;

  /** Whether this is the final chunk */
  done: boolean;

  /** Session ID */
  sessionId: string;

  /** Message ID of the assistant response */
  messageId?: string;
}

// ---------------------------------------------------------------------------
// Chat Handler Options
// ---------------------------------------------------------------------------

export interface ChatHandlerOptions {
  /** Session ID to continue (creates new if omitted) */
  sessionId?: string;

  /** User message to send */
  message: string;

  /** User ID for authenticated sessions */
  userId?: string;

  /** AI generate function (from @vibeonrails/ai) */
  generate: (prompt: string, systemPrompt: string) => Promise<string>;

  /** System prompt content */
  systemPrompt?: string;

  /** Support configuration */
  config?: Partial<SupportConfig>;
}

// ---------------------------------------------------------------------------
// Widget Props
// ---------------------------------------------------------------------------

export interface ChatWidgetProps {
  /** API endpoint for the chat */
  endpoint?: string;

  /** Widget title */
  title?: string;

  /** Input placeholder text */
  placeholder?: string;

  /** "Talk to human" button label */
  escalateLabel?: string;

  /** Initial session ID (for resuming sessions) */
  sessionId?: string;

  /** Custom class name for styling */
  className?: string;

  /** Whether to start the widget open */
  defaultOpen?: boolean;

  /** Callback when escalation occurs */
  onEscalate?: (ticket: EscalationTicket) => void;
}
