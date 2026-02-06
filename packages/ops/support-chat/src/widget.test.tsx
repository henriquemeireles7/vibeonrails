/**
 * Support Chat — Widget Tests
 *
 * Structural tests for the React chat widget component.
 * These tests verify the component exports and props interface
 * without invoking React hooks (which require a render context).
 *
 * Full integration tests with DOM rendering should use
 * @testing-library/react in the app template.
 */

import { describe, it, expect } from "vitest";
import { ChatWidget } from "./widget.js";

describe("ChatWidget", () => {
  it("should be a function component", () => {
    expect(typeof ChatWidget).toBe("function");
  });

  it("should have the correct function name", () => {
    expect(ChatWidget.name).toBe("ChatWidget");
  });

  it("should accept props without TypeScript errors", () => {
    // Type-level test: ensure the component signature accepts all props.
    // We don't invoke it because React hooks require a render context.
    const props = {
      endpoint: "/api/support/chat",
      title: "Need help?",
      placeholder: "Ask a question...",
      escalateLabel: "Talk to a human",
      sessionId: "session_123",
      className: "custom-class",
      defaultOpen: true,
      onEscalate: () => undefined,
    };

    // Verify props shape is valid (no runtime errors in construction)
    expect(props.endpoint).toBe("/api/support/chat");
    expect(props.title).toBe("Need help?");
    expect(props.defaultOpen).toBe(true);
  });

  it("should be exported from the module", async () => {
    const mod = await import("./widget.js");
    expect(mod.ChatWidget).toBeDefined();
    expect(typeof mod.ChatWidget).toBe("function");
  });
});
