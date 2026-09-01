import { HybridKnowledgeRetriever } from "./hybrid-knowledge-retriever.js";
import { InMemoryVectorIndex } from "./in-memory-vector-index.js";
import { KnowledgeEmbeddingIngestor } from "./knowledge-embedding-ingestor.js";
import { KeywordKnowledgeRetriever } from "./keyword-knowledge-retriever.js";
import { buildSeededKnowledgeRepository } from "./seeded-knowledge-repository.js";
import { createEmbeddingProvider } from "./embedding-provider-factory.js";

export async function buildSeededKnowledgeContext(options = {}) {
  const repository = await buildSeededKnowledgeRepository(options);
  const embeddingProvider =
    options.embeddingProvider ??
    createEmbeddingProvider({
      providerName: options.embeddingProviderName,
      openAiApiKey: options.openAiApiKey,
      openAiModel: options.openAiEmbeddingModel,
      dimensions: options.embeddingDimensions,
      fetchImpl: options.fetchImpl
    });
  const vectorIndex = new InMemoryVectorIndex();
  const embeddingIngestor = new KnowledgeEmbeddingIngestor({
    embeddingProvider,
    vectorIndex
  });
  const documents = await repository.listDocuments();

  for (const document of documents) {
    await embeddingIngestor.indexDocument(document);
  }

  const keywordRetriever = new KeywordKnowledgeRetriever({
    repository
  });
  const retriever = new HybridKnowledgeRetriever({
    keywordRetriever,
    embeddingProvider,
    vectorIndex
  });

  return {
    repository,
    retriever
  };
}
