import { EmbeddingProvider } from "./ports.js";

export class OpenAiEmbeddingProvider extends EmbeddingProvider {
  constructor({
    apiKey,
    model = "text-embedding-3-small",
    dimensions,
    fetchImpl = globalThis.fetch,
    endpoint = "https://api.openai.com/v1/embeddings"
  }) {
    super();

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER is openai");
    }

    if (!fetchImpl) {
      throw new Error("A fetch implementation is required for OpenAI embeddings");
    }

    this.name = "openai";
    this.model = model;
    this.apiKey = apiKey;
    this.dimensions = dimensions;
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
  }

  async embedText({ text }) {
    const body = {
      model: this.model,
      input: text,
      encoding_format: "float"
    };

    if (this.dimensions) {
      body.dimensions = this.dimensions;
    }

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const embedding = payload.data?.[0]?.embedding;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("OpenAI embedding response did not include an embedding vector");
    }

    return embedding;
  }
}
