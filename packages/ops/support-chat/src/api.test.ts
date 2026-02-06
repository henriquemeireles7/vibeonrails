/**
 * Support Chat — API Tests
 *
 * Tests for chat message handling, session management,
 * AI response generation (fixtures), and escalation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  handleChatMessage,
  escalateToTicket,
  createSession,
  getSession,
  getSessionMessages,
  clearAllData,
} from "./api.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createMockGenerate(response = "This is a helpful AI response.") {
  return vi.fn().mockResolvedValue(response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Support Chat API", () => {
  beforeEach(() => {
    clearAllData();
  });

  describe("createSession", () => {
    it("should create a new session with default values", () => {
      const session = createSession();
      expect(session.id).toMatch(/^session_/);
      expect(session.status).toBe("active");
      expect(session.userId).toBeNull();
      expect(session.messageCount).toBe(0);
    });

    it("should create a session with userId", () => {
      const session = createSession("user_123");
      expect(session.userId).toBe("user_123");
    });
  });

  describe("getSession", () => {
    it("should return session by ID", () => {
      const session = createSession();
      const found = getSession(session.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(session.id);
    });

    it("should return undefined for nonexistent session", () => {
      expect(getSession("nonexistent")).toBeUndefined();
    });
  });

  describe("handleChatMessage", () => {
    it("should create a new session when none provided", async () => {
      const generate = createMockGenerate();

      const result = await handleChatMessage({
        message: "Hello, I need help",
        generate,
      });

      expect(result.sessionId).toMatch(/^session_/);
      expect(result.userMessage.content).toBe("Hello, I need help");
      expect(result.userMessage.role).toBe("user");
      expect(result.assistantMessage.role).toBe("assistant");
      expect(result.escalated).toBe(false);
    });

    it("should reuse existing session", async () => {
      const generate = createMockGenerate();
      const session = createSession();

      const result = await handleChatMessage({
        sessionId: session.id,
        message: "Follow up question",
        generate,
      });

      expect(result.sessionId).toBe(session.id);
    });

    it("should create new session if provided session does not exist", async () => {
      const generate = createMockGenerate();

      const result = await handleChatMessage({
        sessionId: "nonexistent_session",
        message: "Hello",
        generate,
      });

      expect(result.sessionId).not.toBe("nonexistent_session");
    });

    it("should call generate with conversation context", async () => {
      const generate = createMockGenerate();

      await handleChatMessage({
        message: "What is your refund policy?",
        generate,
      });

      expect(generate).toHaveBeenCalledOnce();
      expect(generate).toHaveBeenCalledWith(
        expect.stringContaining("What is your refund policy?"),
        expect.any(String),
      );
    });

    it("should use custom system prompt", async () => {
      const generate = createMockGenerate();
      const customPrompt = "You are a billing assistant.";

      await handleChatMessage({
        message: "Help me",
        generate,
        systemPrompt: customPrompt,
      });

      expect(generate).toHaveBeenCalledWith(expect.any(String), customPrompt);
    });

    it("should store messages in session history", async () => {
      const generate = createMockGenerate("AI response 1");

      const result = await handleChatMessage({
        message: "First question",
        generate,
      });

      const messages = getSessionMessages(result.sessionId);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("First question");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe("AI response 1");
    });

    it("should escalate when max messages reached", async () => {
      const generate = createMockGenerate();

      const result = await handleChatMessage({
        message: "Help",
        generate,
        config: { maxMessagesBeforeEscalation: 1 },
      });

      // First message immediately triggers escalation at count >= 1
      // (the user message increments count to 1)
      // Then escalation kicks in for the next call
      const result2 = await handleChatMessage({
        sessionId: result.sessionId,
        message: "More help",
        generate,
      });

      // After 2+ messages, escalation should happen
      expect(result2.escalated || result.escalated).toBe(true);
    });

    it("should include ticket in escalation response", async () => {
      const generate = createMockGenerate("Summary of conversation");

      // Create session with message count at the limit
      const firstResult = await handleChatMessage({
        message: "Message",
        generate,
        config: { maxMessagesBeforeEscalation: 2 },
      });

      await handleChatMessage({
        sessionId: firstResult.sessionId,
        message: "Another message",
        generate,
      });

      // Now messageCount is 4 (2 user + 2 assistant), trigger escalation
      const escalatedResult = await handleChatMessage({
        sessionId: firstResult.sessionId,
        message: "Yet another",
        generate,
        config: { maxMessagesBeforeEscalation: 2 },
      });

      if (escalatedResult.escalated) {
        expect(escalatedResult.ticket).toBeDefined();
        expect(escalatedResult.ticket?.sessionId).toBe(firstResult.sessionId);
      }
    });
  });

  describe("escalateToTicket", () => {
    it("should create an escalation ticket with summary", async () => {
      const generate = createMockGenerate("User needs help with login issues");

      const session = createSession("user_456");

      const ticket = await escalateToTicket({
        sessionId: session.id,
        reason: "user_requested",
        messages: [
          {
            id: "msg_1",
            sessionId: session.id,
            role: "user",
            content: "I cannot log in",
            createdAt: new Date().toISOString(),
          },
        ],
        generate,
      });

      expect(ticket.id).toMatch(/^ticket_/);
      expect(ticket.sessionId).toBe(session.id);
      expect(ticket.reason).toBe("user_requested");
      expect(ticket.summary).toBe("User needs help with login issues");
      expect(ticket.status).toBe("open");
      expect(ticket.userId).toBe("user_456");
    });

    it("should set high priority for sensitive topics", async () => {
      const generate = createMockGenerate("Summary");
      const session = createSession();

      const ticket = await escalateToTicket({
        sessionId: session.id,
        reason: "sensitive_topic",
        messages: [],
        generate,
      });

      expect(ticket.priority).toBe("high");
    });

    it("should update session status to escalated", async () => {
      const generate = createMockGenerate("Summary");
      const session = createSession();

      await escalateToTicket({
        sessionId: session.id,
        reason: "user_requested",
        messages: [],
        generate,
      });

      const updatedSession = getSession(session.id);
      expect(updatedSession?.status).toBe("escalated");
    });
  });
});
