import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { InMemoryAgentFeedbackRepository } from "@support/ai";
import { createAuthContext } from "./auth.js";
import { buildApp } from "./app.js";

let app;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe("health route", () => {
  it("returns service status", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ok",
      service: "support-api"
    });
  });
});

describe("auth route", () => {
  it("returns the current default session", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/auth/session"
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.role, "admin");
    assert.ok(body.data.permissions.includes("view_metrics"));
  });

  it("requires headers when header auth mode is enabled", async () => {
    app = await buildApp({
      authContext: createAuthContext({
        mode: "headers",
        defaultUser: {
          id: "unused",
          email: "unused@example.com",
          name: "Unused",
          organizationSlug: "default-support",
          role: "admin"
        }
      })
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/classifications",
      payload: {
        text: "I need help.",
        source: "manual"
      }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "AUTHENTICATION_REQUIRED");
  });

  it("denies agent access to lead-only metrics", async () => {
    app = await buildApp({
      authContext: createAuthContext({
        mode: "headers",
        defaultUser: {
          id: "unused",
          email: "unused@example.com",
          name: "Unused",
          organizationSlug: "default-support",
          role: "admin"
        }
      })
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/metrics",
      headers: {
        "x-support-role": "agent",
        "x-support-user-email": "agent@example.com"
      }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "AUTHORIZATION_DENIED");
  });

  it("allows lead access to audit events", async () => {
    app = await buildApp({
      authContext: createAuthContext({
        mode: "headers",
        defaultUser: {
          id: "unused",
          email: "unused@example.com",
          name: "Unused",
          organizationSlug: "default-support",
          role: "admin"
        }
      })
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/audit/events",
      headers: {
        "x-support-role": "lead",
        "x-support-user-email": "lead@example.com"
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().data, []);
  });
});

describe("classification route", () => {
  it("classifies a support ticket", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/classifications",
      payload: {
        text: "I want a refund because I was charged twice.",
        source: "manual"
      }
    });

    const body = response.json();

    assert.equal(response.statusCode, 201);
    assert.equal(body.data.category, "refund_request");
    assert.equal(body.data.automationEligibility, "automation_blocked");
    assert.ok(body.data.reviewReasons.includes("financial_decision"));
    assert.equal(body.meta.aiRun.provider, "mock");
  });

  it("returns validation errors for invalid requests", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/classifications",
      payload: {
        text: ""
      }
    });

    const body = response.json();

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.issues[0].path, "text");
  });
});

describe("knowledge routes", () => {
  it("lists seeded knowledge documents", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/knowledge/documents"
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.ok(body.data.length >= 5);
    assert.equal(body.data[0].chunkCount > 0, true);
  });

  it("searches seeded knowledge and returns citations", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/knowledge/search",
      payload: {
        query: "refund chargeback human review",
        topK: 3
      }
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.meta.query, "refund chargeback human review");
    assert.equal(body.data.length > 0, true);
    assert.equal(typeof body.data[0].quote, "string");
  });

  it("returns validation errors for invalid search requests", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/knowledge/search",
      payload: {
        query: "",
        topK: 0
      }
    });
    const body = response.json();

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.issues[0].path, "query");
  });
});

describe("copilot route", () => {
  it("creates a cited copilot draft", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/copilot/drafts",
      payload: {
        text: "I was charged twice and want a refund.",
        source: "manual"
      }
    });
    const body = response.json();

    assert.equal(response.statusCode, 201);
    assert.equal(body.data.replyVariants.length, 3);
    assert.equal(body.data.citations.length > 0, true);
    assert.equal(body.data.automationEligibility, "automation_blocked");
    assert.equal(body.meta.aiRun.provider, "mock");
    assert.equal(typeof body.meta.draftId, "string");
  });

  it("returns validation errors for invalid copilot requests", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/copilot/drafts",
      payload: {
        text: "",
        source: "manual"
      }
    });
    const body = response.json();

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.issues[0].path, "text");
  });

  it("stores and lists agent feedback", async () => {
    const feedbackRepository = new InMemoryAgentFeedbackRepository({
      idFactory: () => "feedback-1",
      clock: () => new Date("2026-08-30T10:00:00.000Z")
    });
    app = await buildApp({
      feedbackRepository
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/copilot/feedback",
      payload: {
        draftId: "draft-1",
        decision: "marked_bad_output",
        tone: "concise",
        editedContent: "This response needs a safer policy explanation.",
        reason: "It overpromised the outcome."
      }
    });
    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/copilot/feedback"
    });

    assert.equal(createResponse.statusCode, 201);
    assert.equal(createResponse.json().data.id, "feedback-1");
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().data.length, 1);
  });

  it("returns validation errors for invalid feedback", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/copilot/feedback",
      payload: {
        draftId: "",
        decision: "approve_refund"
      }
    });
    const body = response.json();

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.issues[0].path, "draftId");
  });
});

describe("metrics route", () => {
  it("reports AI, schema, retrieval, and human decision metrics", async () => {
    app = await buildApp();

    await app.inject({
      method: "POST",
      url: "/v1/classifications",
      payload: {
        text: "I want a refund because I was charged twice.",
        source: "manual"
      }
    });
    await app.inject({
      method: "POST",
      url: "/v1/knowledge/search",
      payload: {
        query: "refund chargeback human review",
        topK: 3
      }
    });
    await app.inject({
      method: "POST",
      url: "/v1/copilot/feedback",
      payload: {
        draftId: "draft-1",
        decision: "escalated",
        reason: "Needs supervisor review."
      }
    });
    await app.inject({
      method: "POST",
      url: "/v1/copilot/drafts",
      payload: {
        text: "",
        source: "manual"
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/metrics"
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.ai.totalRuns, 1);
    assert.equal(body.data.ai.byPurpose.ticket_classification, 1);
    assert.equal(body.data.retrieval.totalQueries, 1);
    assert.equal(body.data.retrieval.hitRate, 1);
    assert.equal(body.data.schemas.totalErrors, 1);
    assert.equal(body.data.decisions.escalationCount, 1);
  });
});

describe("audit route", () => {
  it("lists AI run and human decision audit events", async () => {
    app = await buildApp();

    await app.inject({
      method: "POST",
      url: "/v1/classifications",
      payload: {
        text: "I want a refund because I was charged twice.",
        source: "manual"
      }
    });
    await app.inject({
      method: "POST",
      url: "/v1/copilot/feedback",
      payload: {
        draftId: "draft-1",
        decision: "marked_bad_output",
        reason: "The answer overpromised."
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/audit/events"
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.length, 2);
    assert.equal(body.data[0].type, "human_decision_recorded");
    assert.equal(body.data[1].type, "ai_run_completed");
    assert.equal(body.data[1].payload.purpose, "ticket_classification");
  });

  it("filters audit events by type", async () => {
    app = await buildApp();

    await app.inject({
      method: "POST",
      url: "/v1/classifications",
      payload: {
        text: "I want a refund because I was charged twice.",
        source: "manual"
      }
    });
    await app.inject({
      method: "POST",
      url: "/v1/copilot/feedback",
      payload: {
        draftId: "draft-1",
        decision: "escalated"
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/audit/events?type=ai_run_completed&limit=1"
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].type, "ai_run_completed");
  });
});
