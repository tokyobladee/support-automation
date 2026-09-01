import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryKnowledgeRepository } from "./in-memory-knowledge-repository.js";
import { KnowledgeDocumentIngestor } from "./knowledge-document-ingestor.js";
import { KeywordKnowledgeRetriever } from "./keyword-knowledge-retriever.js";

describe("KeywordKnowledgeRetriever", () => {
  it("returns cited chunks for relevant support policy queries", async () => {
    const repository = new InMemoryKnowledgeRepository();
    const ingestor = new KnowledgeDocumentIngestor({ repository });
    await ingestor.ingest({
      title: "Refund Policy",
      source: "policy",
      version: "2026-08",
      language: "en",
      visibility: "agent_only",
      tags: ["refunds", "billing"],
      content: "Refund requests require a human agent. Chargeback cases must be escalated."
    });
    await ingestor.ingest({
      title: "Subscription Help",
      source: "macro",
      version: "2026-08",
      language: "en",
      visibility: "public_safe",
      tags: ["subscription"],
      content: "Customers can cancel subscriptions from account settings before renewal."
    });

    const retriever = new KeywordKnowledgeRetriever({ repository });
    const result = await retriever.search({
      query: "refund chargeback policy",
      topK: 2
    });

    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].title, "Refund Policy");
    assert.equal(result.citations[0].source, "policy");
    assert.equal(result.citations[0].tags.includes("refunds"), true);
  });

  it("filters citations by language and tags", async () => {
    const repository = new InMemoryKnowledgeRepository();
    const ingestor = new KnowledgeDocumentIngestor({ repository });
    await ingestor.ingest({
      title: "Expert Escalation",
      source: "playbook",
      version: "2026-08",
      language: "en",
      visibility: "internal",
      tags: ["experts"],
      content: "Expert complaints are escalated to quality review."
    });
    await ingestor.ingest({
      title: "Повернення коштів",
      source: "policy",
      version: "2026-08",
      language: "uk",
      visibility: "agent_only",
      tags: ["refunds"],
      content: "Запити на повернення коштів перевіряє агент підтримки."
    });

    const retriever = new KeywordKnowledgeRetriever({ repository });
    const result = await retriever.search({
      query: "повернення коштів",
      language: "uk",
      tags: ["refunds"]
    });

    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].language, "uk");
    assert.equal(result.citations[0].title, "Повернення коштів");
  });
});
