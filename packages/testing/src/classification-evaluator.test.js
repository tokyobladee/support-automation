import { describe, expect, it } from "vitest";
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

    expect(report.total).toBe(1);
    expect(report.passed).toBe(1);
    expect(report.accuracy).toBe(1);
  });
});
