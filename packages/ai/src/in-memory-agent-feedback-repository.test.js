import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryAgentFeedbackRepository } from "./in-memory-agent-feedback-repository.js";

describe("InMemoryAgentFeedbackRepository", () => {
  it("stores agent feedback records", async () => {
    const repository = new InMemoryAgentFeedbackRepository({
      idFactory: () => "feedback-1",
      clock: () => new Date("2026-08-30T10:00:00.000Z")
    });

    const feedback = await repository.saveFeedback({
      draftId: "draft-1",
      decision: "marked_bad_output",
      tone: "formal",
      editedContent: "Edited answer",
      reason: "Wrong policy tone"
    });
    const records = await repository.listFeedback();

    assert.equal(feedback.id, "feedback-1");
    assert.equal(records.length, 1);
    assert.equal(records[0].decision, "marked_bad_output");
  });
});
