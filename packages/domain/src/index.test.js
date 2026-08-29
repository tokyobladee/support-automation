import { describe, expect, it } from "vitest";
import {
  automationEligibility,
  priorityLevels,
  resolveAutomationPolicy,
  reviewReasons,
  ticketCategories
} from "./index.js";

describe("automation policy", () => {
  it("allows safe product guidance suggestions", () => {
    const result = resolveAutomationPolicy({
      category: ticketCategories.productGuidance,
      priority: priorityLevels.low,
      confidence: 0.91
    });

    expect(result).toEqual({
      eligibility: automationEligibility.safeToSuggest,
      reviewReasons: []
    });
  });

  it("requires human review for high-impact bug reports", () => {
    const result = resolveAutomationPolicy({
      category: ticketCategories.bug,
      priority: priorityLevels.high,
      confidence: 0.88
    });

    expect(result.eligibility).toBe(automationEligibility.humanReviewRequired);
    expect(result.reviewReasons).toContain(reviewReasons.policySensitiveCategory);
  });

  it("blocks refund decisions from automation", () => {
    const result = resolveAutomationPolicy({
      category: ticketCategories.refundRequest,
      priority: priorityLevels.high,
      confidence: 0.96
    });

    expect(result.eligibility).toBe(automationEligibility.automationBlocked);
    expect(result.reviewReasons).toContain(reviewReasons.blockedCategory);
  });

  it("blocks urgent safety or privacy cases", () => {
    const result = resolveAutomationPolicy({
      category: ticketCategories.subscription,
      priority: priorityLevels.urgent,
      confidence: 0.9,
      signals: [reviewReasons.legalOrPrivacyRisk]
    });

    expect(result.eligibility).toBe(automationEligibility.automationBlocked);
    expect(result.reviewReasons).toEqual(
      expect.arrayContaining([reviewReasons.urgentPriority, reviewReasons.legalOrPrivacyRisk])
    );
  });
});
