import { HashEmbeddingProvider } from "./hash-embedding-provider.js";
import { OpenAiEmbeddingProvider } from "./openai-embedding-provider.js";

export function createEmbeddingProvider({
  providerName = "hash",
  openAiApiKey,
  openAiModel,
  dimensions,
  fetchImpl
} = {}) {
  if (providerName === "hash") {
    return new HashEmbeddingProvider({
      dimensions
    });
  }

  if (providerName === "openai") {
    return new OpenAiEmbeddingProvider({
      apiKey: openAiApiKey,
      model: openAiModel,
      dimensions,
      fetchImpl
    });
  }

  throw new Error(`Unsupported embedding provider: ${providerName}`);
}
