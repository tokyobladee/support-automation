import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateClassifier } from "./classification-evaluator.js";

describe("classification evaluator", () => {
  it("summarizes classifier results", async () => {
    const service = {
      async classify(input) {
        return {
          classification: input.expected
        };
      }
    };
    const report = await evaluateClassifier({
      service,
      cases: [
        {
          id: "one",
          input: {
            expected: {
              category: "subscription",
              priority: "normal",
              automationEligibility: "safe_to_suggest"
            }
          },
          expected: {
            category: "subscription",
            priority: "normal",
            automationEligibility: "safe_to_suggest"
          }
        }
      ]
    });

    assert.equal(report.total, 1);
    assert.equal(report.passed, 1);
    assert.equal(report.accuracy, 1);
    assert.equal(report.categoryAccuracy, 1);
    assert.equal(report.priorityAccuracy, 1);
    assert.equal(report.automationEligibilityAccuracy, 1);
    assert.equal(report.invalidSchemaRate, 0);
    assert.equal(report.blockedAutomationAccuracy, 0);
  });

  it("tracks invalid outputs and blocked automation misses", async () => {
    const service = {
      async classify(input) {
        if (input.text === "invalid") {
          throw new Error("Invalid classifier output");
        }

        return {
          classification: {
            category: "subscription",
            priority: "normal",
            automationEligibility: "safe_to_suggest"
          }
        };
      }
    };
    const report = await evaluateClassifier({
      service,
      cases: [
        {
          id: "blocked-miss",
          input: {
            text: "refund"
          },
          expected: {
            category: "refund_request",
            priority: "high",
            automationEligibility: "automation_blocked"
          }
        },
        {
          id: "invalid-output",
          input: {
            text: "invalid"
          },
          expected: {
            category: "unknown",
            priority: "normal",
            automationEligibility: "automation_blocked"
          }
        }
      ]
    });

    assert.equal(report.total, 2);
    assert.equal(report.passed, 0);
    assert.equal(report.invalidOutputCount, 1);
    assert.equal(report.invalidSchemaRate, 0.5);
    assert.equal(report.blockedAutomationAccuracy, 0);
  });
});
