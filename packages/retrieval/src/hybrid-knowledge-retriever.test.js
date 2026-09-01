import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HashEmbeddingProvider } from "./hash-embedding-provider.js";
import { HybridKnowledgeRetriever } from "./hybrid-knowledge-retriever.js";
import { InMemoryKnowledgeRepository } from "./in-memory-knowledge-repository.js";
import { InMemoryVectorIndex } from "./in-memory-vector-index.js";
import { KeywordKnowledgeRetriever } from "./keyword-knowledge-retriever.js";
import { KnowledgeDocumentIngestor } from "./knowledge-document-ingestor.js";
import { KnowledgeEmbeddingIngestor } from "./knowledge-embedding-ingestor.js";

describe("HybridKnowledgeRetriever", () => {
  it("combines keyword and vector matches into cited results", async () => {
    const repository = new InMemoryKnowledgeRepository();
    const embeddingProvider = new HashEmbeddingProvider();
    const vectorIndex = new InMemoryVectorIndex();
    const documentIngestor = new KnowledgeDocumentIngestor({ repository });
    const embeddingIngestor = new KnowledgeEmbeddingIngestor({
      embeddingProvider,
      vectorIndex
    });
    const document = await documentIngestor.ingest({
      title: "Refund Policy",
      source: "policy",
      version: "2026-08",
      language: "en",
      visibility: "agent_only",
      tags: ["refunds", "billing"],
      content: "Refund requests and chargeback threats require human review."
    });

    await embeddingIngestor.indexDocument(document);

    const retriever = new HybridKnowledgeRetriever({
      keywordRetriever: new KeywordKnowledgeRetriever({ repository }),
      embeddingProvider,
      vectorIndex
    });
    const result = await retriever.search({
      query: "chargeback refund",
      topK: 3
    });

    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].title, "Refund Policy");
    assert.equal(result.citations[0].relevanceScore > 0, true);
  });

  it("returns vector-only citations when lexical overlap is weak", async () => {
    const repository = new InMemoryKnowledgeRepository();
    const embeddingProvider = {
      async embedText({ text }) {
        const normalizedText = text.toLowerCase();

        return normalizedText.includes("refund") || normalizedText.includes("reimbursement")
          ? [1, 0]
          : [0, 1];
      }
    };
    const vectorIndex = new InMemoryVectorIndex();
    const documentIngestor = new KnowledgeDocumentIngestor({ repository });
    const embeddingIngestor = new KnowledgeEmbeddingIngestor({
      embeddingProvider,
      vectorIndex
    });
    const document = await documentIngestor.ingest({
      title: "Money Movement Rules",
      source: "policy",
      version: "2026-08",
      language: "en",
      visibility: "agent_only",
      tags: ["billing"],
      content: "Refund approvals require human review."
    });

    await embeddingIngestor.indexDocument(document);

    const retriever = new HybridKnowledgeRetriever({
      keywordRetriever: new KeywordKnowledgeRetriever({ repository }),
      embeddingProvider,
      vectorIndex
    });
    const result = await retriever.search({
      query: "reimbursement process",
      topK: 1
    });

    assert.equal(result.citations[0]?.title, "Money Movement Rules");
  });
});
