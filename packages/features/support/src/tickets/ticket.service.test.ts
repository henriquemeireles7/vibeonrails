import { describe, it, expect } from "vitest";
import { createTicket, getTicket, listTickets, resolveTicket, closeTicket } from "./ticket.service.js";

// The ticket service uses an in-memory store - we need to verify its functions exist
describe("Ticket Service", () => {
  it("exports CRUD functions", () => {
    expect(typeof createTicket).toBe("function");
    expect(typeof getTicket).toBe("function");
    expect(typeof listTickets).toBe("function");
    expect(typeof resolveTicket).toBe("function");
    expect(typeof closeTicket).toBe("function");
  });
});
