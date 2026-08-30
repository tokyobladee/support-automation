import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
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
