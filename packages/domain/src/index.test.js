import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

    assert.deepEqual(result, {
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

    assert.equal(result.eligibility, automationEligibility.humanReviewRequired);
    assert.ok(result.reviewReasons.includes(reviewReasons.policySensitiveCategory));
  });

  it("blocks refund decisions from automation", () => {
    const result = resolveAutomationPolicy({
      category: ticketCategories.refundRequest,
      priority: priorityLevels.high,
      confidence: 0.96
    });

    assert.equal(result.eligibility, automationEligibility.automationBlocked);
    assert.ok(result.reviewReasons.includes(reviewReasons.blockedCategory));
  });

  it("blocks urgent safety or privacy cases", () => {
    const result = resolveAutomationPolicy({
      category: ticketCategories.subscription,
      priority: priorityLevels.urgent,
      confidence: 0.9,
      signals: [reviewReasons.legalOrPrivacyRisk]
    });

    assert.equal(result.eligibility, automationEligibility.automationBlocked);
    assert.ok(result.reviewReasons.includes(reviewReasons.urgentPriority));
    assert.ok(result.reviewReasons.includes(reviewReasons.legalOrPrivacyRisk));
  });
});
