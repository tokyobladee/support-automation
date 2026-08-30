import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OpenAiEmbeddingProvider } from "./openai-embedding-provider.js";

describe("OpenAiEmbeddingProvider", () => {
  it("creates an embedding vector through the OpenAI embeddings endpoint", async () => {
    let capturedRequest;
    const provider = new OpenAiEmbeddingProvider({
      apiKey: "test-key",
      model: "test-embedding-model",
      dimensions: 8,
      fetchImpl: async (url, request) => {
        capturedRequest = {
          url,
          request,
          body: JSON.parse(request.body)
        };

        return {
          ok: true,
          json: async () => ({
            data: [
              {
                embedding: [0.1, 0.2, 0.3]
              }
            ]
          })
        };
      }
    });

    const embedding = await provider.embedText({
      text: "refund policy"
    });

    assert.deepEqual(embedding, [0.1, 0.2, 0.3]);
    assert.equal(capturedRequest.url, "https://api.openai.com/v1/embeddings");
    assert.equal(capturedRequest.request.headers.Authorization, "Bearer test-key");
    assert.equal(capturedRequest.body.model, "test-embedding-model");
    assert.equal(capturedRequest.body.input, "refund policy");
    assert.equal(capturedRequest.body.dimensions, 8);
    assert.equal(capturedRequest.body.encoding_format, "float");
  });

  it("fails without an API key", () => {
    assert.throws(
      () =>
        new OpenAiEmbeddingProvider({
          apiKey: ""
        }),
      /OPENAI_API_KEY/
    );
  });

  it("fails when OpenAI does not return a vector", async () => {
    const provider = new OpenAiEmbeddingProvider({
      apiKey: "test-key",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          data: []
        })
      })
    });

    await assert.rejects(
      () =>
        provider.embedText({
          text: "refund policy"
        }),
      /embedding vector/
    );
  });
});
