import { describe, expect, it } from "vitest";
import { classificationResponseSchema, ticketIntakeSchema } from "./index.js";

describe("ticket intake schema", () => {
  it("normalizes valid manual input", () => {
    const result = ticketIntakeSchema.parse({
      text: " I need help with my subscription "
    });

    expect(result).toEqual({
      text: "I need help with my subscription",
      source: "manual"
    });
  });

  it("rejects empty ticket text", () => {
    expect(() => ticketIntakeSchema.parse({ text: " " })).toThrow();
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

    expect(result.category).toBe("subscription");
  });
});
