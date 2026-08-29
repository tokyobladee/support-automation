export const ticketCategories = Object.freeze({
  subscription: "subscription",
  bug: "bug",
  expertComplaint: "expert_complaint",
  refundRequest: "refund_request",
  accountAccess: "account_access",
  billing: "billing",
  productGuidance: "product_guidance",
  mixed: "mixed",
  unknown: "unknown"
});

export const automationEligibility = Object.freeze({
  safeToSuggest: "safe_to_suggest",
  humanReviewRequired: "human_review_required",
  automationBlocked: "automation_blocked"
});

export const priorityLevels = Object.freeze({
  low: "low",
  normal: "normal",
  high: "high",
  urgent: "urgent"
});
