import { afterEach, describe, expect, it } from "vitest";
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

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
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

    expect(response.statusCode).toBe(201);
    expect(body.data.category).toBe("refund_request");
    expect(body.data.automationEligibility).toBe("automation_blocked");
    expect(body.data.reviewReasons).toContain("financial_decision");
    expect(body.meta.aiRun.provider).toBe("mock");
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

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.issues[0].path).toBe("text");
  });
});
