/**
 * Support Chat — API
 *
 * Handles chat message processing with AI response generation.
 * Supports SSE streaming for real-time responses with automatic
 * polling fallback for degraded environments.
 *
 * Usage:
 *   import { handleChatMessage, escalateToTicket } from '@vibeonrails/support-chat';
 *
 *   const response = await handleChatMessage({
 *     sessionId: 'session_123',
 *     message: 'How do I reset my password?',
 *     generate: aiProvider.chat,
 *   });
 */

import {
  type ChatMessage,
  type ChatSession,
  type ChatHandlerOptions,
  type SendMessageResponse,
  type EscalationTicket,
  type EscalationReason,
  SupportConfigSchema,
} from "./types.js";

// ---------------------------------------------------------------------------
// In-memory stores (replaced by database in production)
// ---------------------------------------------------------------------------

const sessions = new Map<string, ChatSession>();
const messages = new Map<string, ChatMessage[]>();

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

/**
 * Create a new chat session.
 */
export function createSession(userId?: string): ChatSession {
  const now = new Date().toISOString();
  const session: ChatSession = {
    id: generateId("session"),
    userId: userId ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
    messageCount: 0,
    metadata: {},
  };
  sessions.set(session.id, session);
  messages.set(session.id, []);
  return session;
}

/**
 * Get an existing session by ID.
 */
export function getSession(sessionId: string): ChatSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Get all messages for a session.
 */
export function getSessionMessages(sessionId: string): ChatMessage[] {
  return messages.get(sessionId) ?? [];
}

// ---------------------------------------------------------------------------
// Message Handling
// ---------------------------------------------------------------------------

/**
 * Store a message in the session.
 */
function storeMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string,
): ChatMessage {
  const msg: ChatMessage = {
    id: generateId("msg"),
    sessionId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };

  const sessionMessages = messages.get(sessionId);
  if (sessionMessages) {
    sessionMessages.push(msg);
  } else {
    messages.set(sessionId, [msg]);
  }

  // Update session message count
  const session = sessions.get(sessionId);
  if (session) {
    session.messageCount += 1;
    session.updatedAt = new Date().toISOString();
  }

  return msg;
}

/**
 * Build the prompt from chat history for AI context.
 */
function buildPrompt(sessionMessages: ChatMessage[]): string {
  return sessionMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
}

/**
 * Handle an incoming chat message.
 * Creates session if needed, stores user message, generates AI response.
 */
export async function handleChatMessage(
  options: ChatHandlerOptions,
): Promise<SendMessageResponse> {
  const config = SupportConfigSchema.parse(options.config ?? {});

  // Get or create session
  let session: ChatSession;
  if (options.sessionId) {
    const existing = sessions.get(options.sessionId);
    if (existing && existing.status === "active") {
      session = existing;
    } else {
      session = createSession(options.userId);
    }
  } else {
    session = createSession(options.userId);
  }

  // Store user message
  const userMessage = storeMessage(session.id, "user", options.message);

  // Check if max messages reached
  const shouldEscalate =
    session.messageCount >= config.maxMessagesBeforeEscalation;

  if (shouldEscalate) {
    const ticket = await escalateToTicket({
      sessionId: session.id,
      reason: "max_messages_reached",
      messages: getSessionMessages(session.id),
      generate: options.generate,
    });

    const escalationMsg = storeMessage(
      session.id,
      "assistant",
      "I've created a support ticket for you. A team member will follow up shortly.",
    );

    return {
      sessionId: session.id,
      userMessage,
      assistantMessage: escalationMsg,
      escalated: true,
      ticket,
    };
  }

  // Build prompt with history
  const sessionMessages = getSessionMessages(session.id);
  const prompt = buildPrompt(sessionMessages);

  const systemPrompt =
    options.systemPrompt ??
    "You are a helpful support assistant. Answer questions clearly and concisely. If you cannot help, suggest the user talk to a human.";

  // Generate AI response
  const aiContent = await options.generate(prompt, systemPrompt);
  const assistantMessage = storeMessage(session.id, "assistant", aiContent);

  return {
    sessionId: session.id,
    userMessage,
    assistantMessage,
    escalated: false,
  };
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

export interface EscalateOptions {
  /** Session ID to escalate */
  sessionId: string;

  /** Reason for escalation */
  reason: EscalationReason;

  /** Chat messages for context */
  messages: ChatMessage[];

  /** AI generate function for summary */
  generate: (prompt: string, systemPrompt: string) => Promise<string>;
}

/**
 * Escalate a chat session to a human support ticket.
 * Creates a ticket with an AI-generated conversation summary.
 */
export async function escalateToTicket(
  options: EscalateOptions,
): Promise<EscalationTicket> {
  const { sessionId, reason, messages: chatMessages, generate } = options;

  // Generate conversation summary
  const conversationText = chatMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const summary = await generate(
    `Summarize this support conversation in 2-3 sentences:\n\n${conversationText}`,
    "You are a support ticket summarizer. Be concise and capture the key issue.",
  );

  const session = sessions.get(sessionId);

  // Create escalation ticket
  const ticket: EscalationTicket = {
    id: generateId("ticket"),
    sessionId,
    reason,
    summary,
    userId: session?.userId ?? null,
    priority: reason === "sensitive_topic" ? "high" : "medium",
    status: "open",
    createdAt: new Date().toISOString(),
  };

  // Update session status
  if (session) {
    session.status = "escalated";
    session.updatedAt = new Date().toISOString();
  }

  return ticket;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Clear all in-memory data. Used for testing.
 */
export function clearAllData(): void {
  sessions.clear();
  messages.clear();
  idCounter = 0;
}
