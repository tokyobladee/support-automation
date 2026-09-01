import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runEvaluationSuite } from "./evaluation-runner.js";

describe("evaluation runner", () => {
  it("runs classification and copilot scenarios as one suite", async () => {
    const report = await runEvaluationSuite({
      classificationCases: [
        {
          id: "refund",
          input: {
            text: "I want a refund.",
            source: "manual"
          },
          expected: {
            category: "refund_request",
            priority: "high",
            automationEligibility: "automation_blocked"
          }
        }
      ],
      copilotCases: [
        {
          id: "copilot-refund",
          input: {
            text: "I was charged after cancellation and want a refund.",
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

    assert.equal(report.passed, true);
    assert.equal(report.classification.total, 1);
    assert.equal(report.copilot.total, 1);
    assert.equal(report.metadata.promptRuns.length, 2);
  });
});
