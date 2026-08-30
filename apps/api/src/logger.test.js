import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLoggerOptions, redactHeaders } from "./logger.js";

describe("logger redaction", () => {
  it("redacts sensitive authentication headers", () => {
    const headers = redactHeaders({
      authorization: "Bearer secret",
      "x-support-user-email": "agent@example.com",
      "content-type": "application/json"
    });

    assert.equal(headers.authorization, "[REDACTED]");
    assert.equal(headers["x-support-user-email"], "[REDACTED]");
    assert.equal(headers["content-type"], "application/json");
  });

  it("serializes requests without body payloads", () => {
    const loggerOptions = createLoggerOptions();
    const serialized = loggerOptions.serializers.req({
      method: "POST",
      url: "/v1/classifications",
      host: "localhost:4000",
      remoteAddress: "127.0.0.1",
      headers: {
        authorization: "Bearer secret",
        "content-type": "application/json"
      },
      body: {
        text: "sensitive ticket text"
      }
    });

    assert.equal(serialized.body, undefined);
    assert.equal(serialized.headers.authorization, "[REDACTED]");
  });
});
