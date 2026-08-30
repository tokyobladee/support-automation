import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryMetricsRecorder, InMemoryTraceRecorder, instrumentMethods } from "./index.js";

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
      queryLength: 24,
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

describe("InMemoryTraceRecorder", () => {
  it("records span names and safe attributes around operations", async () => {
    const traceRecorder = new InMemoryTraceRecorder();

    const result = await traceRecorder.trace(
      "ai.model_call",
      {
        attributes: {
          "ai.provider": "mock",
          "ticket.text": {
            raw: "never record objects"
          }
        }
      },
      async (span) => {
        span.setAttribute("ai.model", "mock-support-model");

        return "ok";
      }
    );

    const spans = traceRecorder.snapshot();

    assert.equal(result, "ok");
    assert.equal(spans[0].name, "ai.model_call");
    assert.equal(spans[0].status, "ok");
    assert.equal(spans[0].attributes["ai.provider"], "mock");
    assert.equal(spans[0].attributes["ai.model"], "mock-support-model");
    assert.equal(spans[0].attributes["ticket.text"], undefined);
  });

  it("can instrument methods while preserving object properties", async () => {
    const traceRecorder = new InMemoryTraceRecorder();
    const provider = {
      name: "mock",
      model: "mock-support-model",
      async classifyTicket(input) {
        return {
          attempt: input.attempt
        };
      }
    };
    const instrumentedProvider = instrumentMethods({
      target: provider,
      traceRecorder,
      spans: {
        classifyTicket: {
          name: "ai.classify_ticket",
          options: ([input]) => ({
            attributes: {
              "ai.provider": provider.name,
              "ai.model": provider.model,
              "ai.attempt": input.attempt
            }
          })
        }
      }
    });

    const output = await instrumentedProvider.classifyTicket({
      attempt: 1
    });

    assert.equal(instrumentedProvider.name, "mock");
    assert.equal(output.attempt, 1);
    assert.equal(traceRecorder.snapshot()[0].name, "ai.classify_ticket");
  });

  it("marks failed spans with error details", async () => {
    const traceRecorder = new InMemoryTraceRecorder();

    await assert.rejects(
      () =>
        traceRecorder.trace("persistence.save", {}, async () => {
          throw new Error("database unavailable");
        }),
      /database unavailable/u
    );

    const spans = traceRecorder.snapshot();

    assert.equal(spans[0].status, "error");
    assert.equal(spans[0].errorMessage, "database unavailable");
  });
});
