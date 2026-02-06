/**
 * Support Chat — Widget
 *
 * Simple React chat widget component with:
 * - Text input for user messages
 * - AI response display
 * - "Talk to human" escalation button
 * - Session persistence
 *
 * Usage:
 *   import { ChatWidget } from '@vibeonrails/support-chat';
 *
 *   <ChatWidget
 *     endpoint="/api/support/chat"
 *     title="Need help?"
 *     placeholder="Ask a question..."
 *   />
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import type { ChatWidgetProps, EscalationTicket } from "./types.js";

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// ChatWidget Component
// ---------------------------------------------------------------------------

export function ChatWidget({
  endpoint = "/api/support/chat",
  title = "Support Chat",
  placeholder = "Type your message...",
  escalateLabel = "Talk to a human",
  sessionId: initialSessionId,
  className,
  defaultOpen = false,
  onEscalate,
}: ChatWidgetProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(
    initialSessionId,
  );
  const [escalated, setEscalated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      // Add user message to display
      const userMsg: DisplayMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: content.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          sessionId: string;
          assistantMessage: { id: string; content: string; createdAt: string };
          escalated: boolean;
          ticket?: EscalationTicket;
        };

        // Store session ID for continuity
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }

        // Add assistant response
        const assistantMsg: DisplayMessage = {
          id: data.assistantMessage.id,
          role: "assistant",
          content: data.assistantMessage.content,
          createdAt: data.assistantMessage.createdAt,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Handle escalation
        if (data.escalated) {
          setEscalated(true);
          if (data.ticket && onEscalate) {
            onEscalate(data.ticket);
          }
        }
      } catch {
        const errorMsg: DisplayMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again or talk to a human.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, sessionId, loading, onEscalate],
  );

  const handleEscalate = useCallback(async () => {
    if (escalated) return;

    setLoading(true);
    try {
      const response = await fetch(`${endpoint}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          reason: "user_requested",
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { ticket: EscalationTicket };
        setEscalated(true);

        const escalationMsg: DisplayMessage = {
          id: `escalation_${Date.now()}`,
          role: "assistant",
          content:
            "I've created a support ticket. A team member will follow up shortly.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, escalationMsg]);

        if (data.ticket && onEscalate) {
          onEscalate(data.ticket);
        }
      }
    } catch {
      // Silently handle escalation errors
    } finally {
      setLoading(false);
    }
  }, [endpoint, sessionId, escalated, onEscalate]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void sendMessage(input);
    },
    [input, sendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label="Open support chat"
        data-testid="chat-toggle"
      >
        {title}
      </button>
    );
  }

  return (
    <div
      className={className}
      role="dialog"
      aria-label={title}
      data-testid="chat-widget"
    >
      {/* Header */}
      <div data-testid="chat-header">
        <span>{title}</span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
          data-testid="chat-close"
        >
          Close
        </button>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        data-testid="chat-messages"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-role={msg.role}
            data-testid={`message-${msg.role}`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div aria-label="Loading" data-testid="chat-loading">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!escalated ? (
        <form onSubmit={handleSubmit} data-testid="chat-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            aria-label="Chat message input"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            data-testid="chat-send"
          >
            Send
          </button>
          <button
            type="button"
            onClick={handleEscalate}
            disabled={loading}
            data-testid="chat-escalate"
          >
            {escalateLabel}
          </button>
        </form>
      ) : (
        <div data-testid="chat-escalated">
          A support ticket has been created. We will follow up shortly.
        </div>
      )}
    </div>
  );
}
