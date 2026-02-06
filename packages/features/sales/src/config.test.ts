import { describe, it, expect } from "vitest";
import { defineSalesAgent } from "./config.js";

describe("Sales Agent Config", () => {
  it("defines a sales agent config", () => {
    const agent = defineSalesAgent({
      name: "SalesBot",
      tone: "friendly",
      channels: ["webchat", "whatsapp"],
      qualificationQuestions: ["What is your budget?", "When do you need this?"],
    });
    expect(agent.name).toBe("SalesBot");
    expect(agent.channels).toHaveLength(2);
    expect(agent.qualificationQuestions).toHaveLength(2);
  });
});
