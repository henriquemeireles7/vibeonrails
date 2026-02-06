/**
 * Outreach Engine Tests
 *
 * Tests for sequence creation, personalization, and sending schedule.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createOutreachEngine, type OutreachEngine } from "./outreach.js";
import type { Contact } from "./types.js";

const mockContact: Contact = {
  id: "con_test1",
  email: "jane@acme.com",
  name: "Jane Doe",
  company: "Acme Corp",
  stage: "lead",
  tags: [],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockContact2: Contact = {
  id: "con_test2",
  email: "john@other.com",
  name: "John Smith",
  company: "Other Inc",
  stage: "qualified",
  tags: [],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("Outreach Engine", () => {
  let engine: OutreachEngine;

  beforeEach(() => {
    engine = createOutreachEngine();
  });

  // -----------------------------------------------------------------------
  // Sequence Management
  // -----------------------------------------------------------------------

  describe("Sequence Management", () => {
    it("should create a sequence", async () => {
      const sequence = await engine.createSequence({
        name: "Cold Outreach Q1",
        steps: [
          { delayDays: 0, subject: "Intro", body: "Hi {{name}}" },
          { delayDays: 3, subject: "Follow-up", body: "Following up..." },
        ],
        contactIds: ["con_1"],
      });

      expect(sequence.id).toMatch(/^seq_/);
      expect(sequence.name).toBe("Cold Outreach Q1");
      expect(sequence.steps).toHaveLength(2);
      expect(sequence.status).toBe("draft");
    });

    it("should get a sequence by ID", async () => {
      const created = await engine.createSequence({
        name: "Test",
        steps: [{ delayDays: 0, subject: "Hi", body: "Hello" }],
        contactIds: [],
      });

      const found = await engine.getSequence(created.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe("Test");
    });

    it("should return undefined for non-existent sequence", async () => {
      const found = await engine.getSequence("seq_nonexistent");
      expect(found).toBeUndefined();
    });

    it("should list sequences", async () => {
      await engine.createSequence({
        name: "Seq 1",
        steps: [{ delayDays: 0, subject: "Hi", body: "Hello" }],
        contactIds: [],
      });
      await engine.createSequence({
        name: "Seq 2",
        steps: [{ delayDays: 0, subject: "Hi", body: "Hello" }],
        contactIds: [],
      });

      const sequences = await engine.listSequences();
      expect(sequences).toHaveLength(2);
    });

    it("should validate sequence input", async () => {
      await expect(
        engine.createSequence({
          name: "",
          steps: [],
          contactIds: [],
        }),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Personalization
  // -----------------------------------------------------------------------

  describe("Personalization", () => {
    it("should replace template variables", () => {
      const result = engine.personalize(
        "Hi {{name}}, I noticed {{company}} is growing fast.",
        mockContact,
      );

      expect(result).toBe("Hi Jane Doe, I noticed Acme Corp is growing fast.");
    });

    it("should handle missing company gracefully", () => {
      const noCompany: Contact = { ...mockContact, company: undefined };
      const result = engine.personalize("About {{company}}", noCompany);
      expect(result).toBe("About your company");
    });

    it("should handle unknown variables", () => {
      const result = engine.personalize("Hi {{unknown}}", mockContact);
      expect(result).toBe("Hi {{unknown}}");
    });

    it("should apply extra variables", () => {
      const result = engine.personalize("Try {{product}} today!", mockContact, {
        product: "VoR Pro",
      });
      expect(result).toBe("Try VoR Pro today!");
    });

    it("should use default variables from config", () => {
      const customEngine = createOutreachEngine({
        defaultVariables: { product: "VoR", sender: "Team" },
      });

      const result = customEngine.personalize(
        "{{sender}} here, try {{product}}!",
        mockContact,
      );

      expect(result).toBe("Team here, try VoR!");
    });
  });

  // -----------------------------------------------------------------------
  // Schedule
  // -----------------------------------------------------------------------

  describe("Schedule", () => {
    it("should calculate send schedule", async () => {
      const sequence = await engine.createSequence({
        name: "Test",
        steps: [
          { delayDays: 0, subject: "Step 1 for {{name}}", body: "Hi {{name}}" },
          { delayDays: 3, subject: "Step 2", body: "Follow up" },
          { delayDays: 7, subject: "Step 3", body: "Last chance" },
        ],
        contactIds: [mockContact.id],
      });

      const startDate = new Date("2026-02-01T10:00:00Z");
      const schedule = await engine.getSchedule(
        sequence.id,
        [mockContact],
        startDate,
      );

      expect(schedule).toHaveLength(3);
      expect(schedule[0]!.scheduledDate).toEqual(startDate);
      expect(schedule[0]!.subject).toBe("Step 1 for Jane Doe");
      expect(schedule[1]!.scheduledDate.getTime()).toBe(
        startDate.getTime() + 3 * 24 * 60 * 60 * 1000,
      );
      expect(schedule[2]!.scheduledDate.getTime()).toBe(
        startDate.getTime() + (3 + 7) * 24 * 60 * 60 * 1000,
      );
    });

    it("should schedule for multiple contacts", async () => {
      const sequence = await engine.createSequence({
        name: "Multi",
        steps: [
          { delayDays: 0, subject: "Hi {{name}}", body: "Hello" },
          { delayDays: 2, subject: "Follow up", body: "Check in" },
        ],
        contactIds: [mockContact.id, mockContact2.id],
      });

      const schedule = await engine.getSchedule(
        sequence.id,
        [mockContact, mockContact2],
        new Date("2026-02-01"),
      );

      // 2 contacts * 2 steps = 4 sends
      expect(schedule).toHaveLength(4);
    });

    it("should sort schedule by date", async () => {
      const sequence = await engine.createSequence({
        name: "Sorted",
        steps: [
          { delayDays: 0, subject: "Now", body: "Now" },
          { delayDays: 1, subject: "Tomorrow", body: "Later" },
        ],
        contactIds: [mockContact.id, mockContact2.id],
      });

      const schedule = await engine.getSchedule(
        sequence.id,
        [mockContact, mockContact2],
        new Date("2026-02-01"),
      );

      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i]!.scheduledDate.getTime()).toBeGreaterThanOrEqual(
          schedule[i - 1]!.scheduledDate.getTime(),
        );
      }
    });

    it("should throw for non-existent sequence", async () => {
      await expect(
        engine.getSchedule("seq_fake", [mockContact]),
      ).rejects.toThrow("Sequence not found");
    });
  });

  // -----------------------------------------------------------------------
  // Send History
  // -----------------------------------------------------------------------

  describe("Send History", () => {
    it("should record and retrieve sends", async () => {
      const send = await engine.recordSend({
        sequenceId: "seq_test",
        contactId: "con_test",
        stepIndex: 0,
        sentAt: new Date(),
        status: "sent",
      });

      expect(send.id).toMatch(/^send_/);

      const history = await engine.getSendHistory("seq_test");
      expect(history).toHaveLength(1);
      expect(history[0]!.status).toBe("sent");
    });

    it("should filter history by sequence", async () => {
      await engine.recordSend({
        sequenceId: "seq_a",
        contactId: "con_1",
        stepIndex: 0,
        sentAt: new Date(),
        status: "sent",
      });
      await engine.recordSend({
        sequenceId: "seq_b",
        contactId: "con_1",
        stepIndex: 0,
        sentAt: new Date(),
        status: "sent",
      });

      const historyA = await engine.getSendHistory("seq_a");
      expect(historyA).toHaveLength(1);
    });
  });
});
