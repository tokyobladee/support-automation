import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryAuditLog } from "./index.js";

describe("InMemoryAuditLog", () => {
  it("records AI runs and human decisions in reverse chronological order", async () => {
    let nextId = 1;
    const auditLog = new InMemoryAuditLog({
      idFactory: () => `audit-${nextId++}`,
      clock: () => new Date("2026-08-30T10:00:00.000Z")
    });

    await auditLog.recordAiRun({
      provider: "mock",
      purpose: "ticket_classification"
    });
    await auditLog.recordHumanDecision({
      decision: "escalated",
      draftId: "draft-1"
    });

    const events = await auditLog.listEvents();

    assert.equal(events.length, 2);
    assert.equal(events[0].type, "human_decision_recorded");
    assert.equal(events[1].type, "ai_run_completed");
  });

  it("filters by event type and limit", async () => {
    const auditLog = new InMemoryAuditLog({
      idFactory: () => crypto.randomUUID()
    });

    await auditLog.recordAiRun({
      provider: "mock"
    });
    await auditLog.recordHumanDecision({
      decision: "accepted"
    });

    const events = await auditLog.listEvents({
      type: "ai_run_completed",
      limit: 1
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].type, "ai_run_completed");
  });
});
