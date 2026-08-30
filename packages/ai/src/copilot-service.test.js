import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryClassificationRepository } from "./in-memory-classification-repository.js";
import { InMemoryCopilotRepository } from "./in-memory-copilot-repository.js";
import { MockTicketClassifierProvider } from "./mock-ticket-classifier-provider.js";
import { CopilotService } from "./copilot-service.js";
import { TicketClassificationService } from "./ticket-classification-service.js";

function createClassificationService(provider = new MockTicketClassifierProvider()) {
  return new TicketClassificationService({
    provider,
    repository: new InMemoryClassificationRepository()
  });
}

function createKnowledgeRetriever(citations = [createCitation()]) {
  return {
    async search(input) {
      return {
        query: input.query,
        citations
      };
    }
  };
}

function createCitation() {
  return {
    documentId: "doc-subscription",
    chunkId: "chunk-subscription",
    title: "Subscription Cancellation Playbook",
    source: "support-playbook",
    sourceUri: "https://internal.example.com/support/subscription-cancellation",
    version: "2026-08",
    language: "en",
    position: 0,
    quote: "Customers can cancel subscriptions from Account Settings before the renewal date.",
    relevanceScore: 0.92,
    tags: ["subscription", "self-service"]
  };
}

describe("CopilotService", () => {
  it("creates a cited summary and three reply variants", async () => {
    const provider = new MockTicketClassifierProvider();
    const repository = new InMemoryCopilotRepository();
    const service = new CopilotService({
      classificationService: createClassificationService(provider),
      provider,
      knowledgeRetriever: createKnowledgeRetriever(),
      repository
    });

    const result = await service.draftReply({
      text: "I was charged twice and want a refund.",
      source: "manual"
    });

    assert.equal(result.result.replyVariants.length, 3);
    assert.equal(result.result.citations.length > 0, true);
    assert.equal(result.result.replyVariants.every((variant) => variant.citationChunkIds.length > 0), true);
    assert.equal(repository.all().length, 1);
  });

  it("removes citation ids that were not returned by retrieval", async () => {
    const provider = {
      name: "unsafe-fake",
      model: "unsafe-fake-v1",
      async classifyTicket() {
        return new MockTicketClassifierProvider().classifyTicket({
          request: {
            text: "How do I cancel my subscription?",
            source: "manual"
          }
        });
      },
      async generateReplyVariants() {
        return {
          summary: "The customer asks about cancelling a subscription.",
          replyVariants: [
            {
              tone: "formal",
              subject: "Subscription cancellation",
              body: "Please use account settings to cancel before renewal.",
              citationChunkIds: ["not-from-retrieval"]
            }
          ],
          reviewReasons: []
        };
      }
    };
    const service = new CopilotService({
      classificationService: createClassificationService(provider),
      provider,
      knowledgeRetriever: createKnowledgeRetriever()
    });

    const result = await service.draftReply({
      text: "How do I cancel my subscription?",
      source: "manual"
    });

    assert.deepEqual(result.result.replyVariants[0].citationChunkIds, []);
  });

  it("flags drafts without enough knowledge citations", async () => {
    const provider = new MockTicketClassifierProvider();
    const service = new CopilotService({
      classificationService: createClassificationService(provider),
      provider,
      knowledgeRetriever: createKnowledgeRetriever([])
    });

    const result = await service.draftReply({
      text: "Please help with this strange account problem.",
      source: "manual"
    });

    assert.equal(result.result.citations.length, 0);
    assert.equal(result.result.reviewReasons.includes("missing_knowledge_citation"), true);
  });
});
