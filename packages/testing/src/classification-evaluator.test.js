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
  });
});
