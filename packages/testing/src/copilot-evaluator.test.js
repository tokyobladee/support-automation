import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateCopilot } from "./copilot-evaluator.js";

describe("copilot evaluator", () => {
  it("passes cited drafts with expected tones and review policy", async () => {
    const service = {
      async draftReply() {
        return {
          result: {
            summary: "Customer asks about a refund.",
            replyVariants: [
              {
                tone: "formal",
                subject: "Refund request",
                body: "A human agent will review this.",
                citationChunkIds: ["chunk-1"]
              },
              {
                tone: "empathetic",
                subject: "Refund request",
                body: "I understand the frustration.",
                citationChunkIds: ["chunk-1"]
              },
              {
                tone: "concise",
                subject: "Refund request",
                body: "We will review this.",
                citationChunkIds: ["chunk-1"]
              }
            ],
            reviewReasons: ["financial_decision"],
            citations: [
              {
                chunkId: "chunk-1"
              }
            ],
            automationEligibility: "automation_blocked"
          }
        };
      }
    };

    const report = await evaluateCopilot({
      service,
      cases: [
        {
          id: "refund",
          input: {
            text: "Refund me",
            source: "manual"
          },
          expected: {
            tones: ["formal", "empathetic", "concise"],
            requiresCitation: true,
            automationEligibility: "automation_blocked",
            reviewReasons: ["financial_decision"]
          }
        }
      ]
    });

    assert.equal(report.passed, 1);
    assert.equal(report.citationIntegrityAccuracy, 1);
  });

  it("fails drafts that cite chunks outside retrieved context", async () => {
    const service = {
      async draftReply() {
        return {
          result: {
            summary: "Customer asks for help.",
            replyVariants: [
              {
                tone: "formal",
                subject: "Help",
                body: "We can help.",
                citationChunkIds: ["missing-chunk"]
              }
            ],
            reviewReasons: [],
            citations: [
              {
                chunkId: "chunk-1"
              }
            ],
            automationEligibility: "safe_to_suggest"
          }
        };
      }
    };

    const report = await evaluateCopilot({
      service,
      cases: [
        {
          id: "bad-citation",
          input: {
            text: "Help",
            source: "manual"
          },
          expected: {
            tones: ["formal"],
            requiresCitation: true,
            automationEligibility: "safe_to_suggest",
            reviewReasons: []
          }
        }
      ]
    });

    assert.equal(report.failed, 1);
    assert.equal(report.results[0].citationIntegrityMatched, false);
  });
});
