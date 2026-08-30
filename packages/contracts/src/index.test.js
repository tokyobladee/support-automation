import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classificationResponseSchema,
  copilotResponseSchema,
  knowledgeDocumentInputSchema,
  knowledgeSearchRequestSchema,
  ticketIntakeSchema
} from "./index.js";

describe("ticket intake schema", () => {
  it("normalizes valid manual input", () => {
    const result = ticketIntakeSchema.parse({
      text: " I need help with my subscription "
    });

    assert.deepEqual(result, {
      text: "I need help with my subscription",
      source: "manual"
    });
  });

  it("rejects empty ticket text", () => {
    assert.throws(() => ticketIntakeSchema.parse({ text: " " }));
  });

  it("accepts structured classifier output", () => {
    const result = classificationResponseSchema.parse({
      category: "subscription",
      priority: "normal",
      automationEligibility: "safe_to_suggest",
      confidence: 0.87,
      recommendedNextStep: "Send subscription management instructions.",
      rationale: "The ticket asks how to update a subscription.",
      reviewReasons: [],
      evidence: [
        {
          quote: "change my plan",
          reason: "Direct subscription-management request"
        }
      ]
    });

    assert.equal(result.category, "subscription");
  });
});

describe("knowledge contracts", () => {
  it("normalizes knowledge document defaults", () => {
    const result = knowledgeDocumentInputSchema.parse({
      title: "Refund Policy",
      source: "policy",
      version: "2026-08",
      content: "Refund requests require human review."
    });

    assert.equal(result.language, "en");
    assert.equal(result.visibility, "internal");
    assert.deepEqual(result.tags, []);
  });

  it("rejects invalid knowledge metadata", () => {
    assert.throws(() =>
      knowledgeDocumentInputSchema.parse({
        title: "Refund Policy",
        source: "policy",
        sourceUri: "not-a-url",
        version: "2026-08",
        validFrom: "August",
        content: "Refund requests require human review."
      })
    );
  });

  it("normalizes search request defaults", () => {
    const result = knowledgeSearchRequestSchema.parse({
      query: "refund policy"
    });

    assert.equal(result.topK, 5);
    assert.deepEqual(result.tags, []);
  });
});

describe("copilot contracts", () => {
  it("accepts structured copilot responses", () => {
    const result = copilotResponseSchema.parse({
      summary: "The customer wants help cancelling before renewal.",
      replyVariants: [
        {
          tone: "formal",
          subject: "Subscription cancellation",
          body: "Hello, you can cancel from Account Settings before renewal.",
          citationChunkIds: ["chunk-subscription"]
        }
      ],
      reviewReasons: [],
      classification: {
        category: "subscription",
        priority: "normal",
        automationEligibility: "safe_to_suggest",
        confidence: 0.91,
        recommendedNextStep: "Send cancellation guidance.",
        rationale: "The ticket asks about cancelling a subscription.",
        reviewReasons: [],
        evidence: [
          {
            quote: "I want to cancel",
            reason: "Cancellation request"
          }
        ]
      },
      citations: [
        {
          documentId: "doc-subscription",
          chunkId: "chunk-subscription",
          title: "Subscription Cancellation Playbook",
          source: "support-playbook",
          sourceUri: "https://internal.example.com/support/subscription-cancellation",
          version: "2026-08",
          language: "en",
          position: 0,
          quote: "Customers can cancel subscriptions from Account Settings.",
          relevanceScore: 0.9,
          tags: ["subscription"]
        }
      ],
      automationEligibility: "safe_to_suggest"
    });

    assert.equal(result.replyVariants[0].tone, "formal");
  });
});
