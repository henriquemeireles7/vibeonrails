import { describe, it, expect } from "vitest";
import { defineSequence } from "./define.js";

describe("Email Sequence", () => {
  it("defines an email sequence", () => {
    const seq = defineSequence({
      name: "Welcome",
      steps: [
        { templateId: "welcome", delayDays: 0, subject: "Welcome!" },
        { templateId: "follow-up", delayDays: 3, subject: "How's it going?" },
      ],
    });
    expect(seq.name).toBe("Welcome");
    expect(seq.steps).toHaveLength(2);
  });
});
