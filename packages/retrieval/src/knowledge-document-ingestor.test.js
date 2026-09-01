import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryKnowledgeRepository } from "./in-memory-knowledge-repository.js";
import { KnowledgeDocumentIngestor } from "./knowledge-document-ingestor.js";

describe("KnowledgeDocumentIngestor", () => {
  it("creates a versioned knowledge document with deterministic chunks", async () => {
    const repository = new InMemoryKnowledgeRepository();
    const ingestor = new KnowledgeDocumentIngestor({ repository });
    const document = await ingestor.ingest({
      title: "Refund Policy",
      source: "policy",
      version: "2026-08",
      language: "en",
      visibility: "agent_only",
      tags: ["refunds", "billing"],
      content: "Refund requests require a human agent. Chargeback cases must be escalated."
    });

    assert.equal(document.title, "Refund Policy");
    assert.equal(document.visibility, "agent_only");
    assert.equal(document.chunks.length, 1);
    assert.equal(document.chunks[0].position, 0);
    assert.equal(document.chunks[0].documentId, document.id);
    assert.equal(document.contentHash.length, 64);
  });
});
