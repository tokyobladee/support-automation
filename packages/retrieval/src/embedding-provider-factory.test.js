import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmbeddingProvider } from "./embedding-provider-factory.js";
import { HashEmbeddingProvider } from "./hash-embedding-provider.js";
import { OpenAiEmbeddingProvider } from "./openai-embedding-provider.js";

describe("createEmbeddingProvider", () => {
  it("creates a hash embedding provider by default", () => {
    const provider = createEmbeddingProvider();

    assert.equal(provider instanceof HashEmbeddingProvider, true);
  });

  it("creates an OpenAI embedding provider", () => {
    const provider = createEmbeddingProvider({
      providerName: "openai",
      openAiApiKey: "test-key",
      openAiModel: "test-model",
      dimensions: 16,
      fetchImpl: async () => ({})
    });

    assert.equal(provider instanceof OpenAiEmbeddingProvider, true);
    assert.equal(provider.model, "test-model");
    assert.equal(provider.dimensions, 16);
  });

  it("rejects unsupported embedding providers", () => {
    assert.throws(
      () =>
        createEmbeddingProvider({
          providerName: "unknown"
        }),
      /Unsupported embedding provider/
    );
  });
});
