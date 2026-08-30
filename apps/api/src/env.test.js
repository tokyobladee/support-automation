import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEnv } from "./env.js";

describe("API environment validation", () => {
  it("allows local development defaults", () => {
    const env = parseEnv({});

    assert.equal(env.NODE_ENV, "development");
    assert.equal(env.PERSISTENCE_PROVIDER, "memory");
    assert.equal(env.AUTH_MODE, "disabled");
  });

  it("rejects unsafe production configuration", () => {
    assert.throws(
      () =>
        parseEnv({
          NODE_ENV: "production",
          AUTH_MODE: "disabled",
          TRACING_PROVIDER: "none",
          PERSISTENCE_PROVIDER: "memory",
          AI_PROVIDER: "mock",
          EMBEDDING_PROVIDER: "hash"
        }),
      /AUTH_MODE must not be disabled in production/u
    );
  });

  it("accepts production configuration with durable providers and auth", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      AUTH_MODE: "headers",
      TRACING_PROVIDER: "opentelemetry",
      PERSISTENCE_PROVIDER: "prisma",
      AI_PROVIDER: "openai",
      EMBEDDING_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      DATABASE_URL: "postgresql://support:support@postgres:5432/support_ai_copilot"
    });

    assert.equal(env.NODE_ENV, "production");
    assert.equal(env.AUTH_MODE, "headers");
    assert.equal(env.PERSISTENCE_PROVIDER, "prisma");
  });
});
