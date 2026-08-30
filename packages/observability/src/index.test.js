import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryMetricsRecorder } from "./index.js";

describe("InMemoryMetricsRecorder", () => {
  it("summarizes AI, schema, retrieval, and human decision metrics", () => {
    const recorder = new InMemoryMetricsRecorder({
      clock: () => new Date("2026-08-30T10:00:00.000Z")
    });

    recorder.recordAiRun({
      purpose: "ticket_classification",
      provider: "mock",
      latencyMs: 25,
      inputTokens: 10,
      outputTokens: 12,
      costUsd: 0.001
    });
    recorder.recordSchemaValidationError({
      route: "POST /v1/classifications"
    });
    recorder.recordRetrieval({
      resultCount: 2
    });
    recorder.recordRetrieval({
      resultCount: 0
    });
    recorder.recordHumanDecision({
      decision: "escalated"
    });

    const snapshot = recorder.snapshot();

    assert.equal(snapshot.ai.totalRuns, 1);
    assert.equal(snapshot.ai.latencyMs.average, 25);
    assert.equal(snapshot.ai.tokenUsage.inputTokens, 10);
    assert.equal(snapshot.schemas.totalErrors, 1);
    assert.equal(snapshot.retrieval.hitRate, 0.5);
    assert.equal(snapshot.decisions.escalationCount, 1);
  });
});
