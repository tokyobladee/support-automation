import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWebEnv } from "./env.js";

describe("web environment validation", () => {
  it("uses the local API by default", () => {
    const env = parseWebEnv({});

    assert.equal(env.NEXT_PUBLIC_API_BASE_URL, "http://localhost:4000");
    assert.equal(env.NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS, false);
  });

  it("accepts an explicit sample ticket flag", () => {
    const env = parseWebEnv({
      NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS: "true"
    });

    assert.equal(env.NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS, true);
  });

  it("rejects invalid API base URLs", () => {
    assert.throws(
      () =>
        parseWebEnv({
          NEXT_PUBLIC_API_BASE_URL: "support-api"
        }),
      /Invalid URL/u
    );
  });
});
