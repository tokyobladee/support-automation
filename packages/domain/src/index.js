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

export const ticketCategoryValues = Object.freeze(Object.values(ticketCategories));

export const ticketCategoryDefinitions = Object.freeze({
  [ticketCategories.subscription]: {
    label: "Subscription",
    description: "Plan changes, cancellations, renewals, trial access, and subscription status questions",
    defaultPriority: "normal",
    policySensitive: false
  },
  [ticketCategories.bug]: {
    label: "Bug",
    description: "Product defects, broken flows, unexpected errors, crashes, and reproducibility reports",
    defaultPriority: "high",
    policySensitive: true
  },
  [ticketCategories.expertComplaint]: {
    label: "Expert complaint",
    description: "Complaints about expert quality, tone, delays, correctness, or professional conduct",
    defaultPriority: "high",
    policySensitive: true
  },
  [ticketCategories.refundRequest]: {
    label: "Refund request",
    description: "Refunds, chargebacks, compensation, billing reversal, or money-back requests",
    defaultPriority: "high",
    policySensitive: true
  },
  [ticketCategories.accountAccess]: {
    label: "Account access",
    description: "Login issues, account ownership, password reset, email changes, and access recovery",
    defaultPriority: "high",
    policySensitive: true
  },
  [ticketCategories.billing]: {
    label: "Billing",
    description: "Payments, invoices, failed charges, receipts, pricing, and billing confusion",
    defaultPriority: "normal",
    policySensitive: true
  },
  [ticketCategories.productGuidance]: {
    label: "Product guidance",
    description: "How-to questions, feature discovery, onboarding, settings, and general product usage",
    defaultPriority: "low",
    policySensitive: false
  },
  [ticketCategories.mixed]: {
    label: "Mixed",
    description: "Multiple unrelated topics or a request that combines policy, bug, billing, or expert issues",
    defaultPriority: "high",
    policySensitive: true
  },
  [ticketCategories.unknown]: {
    label: "Unknown",
    description: "Insufficient, ambiguous, unsupported, or unclear ticket content",
    defaultPriority: "normal",
    policySensitive: true
  }
});

export const priorityLevels = Object.freeze({
  low: "low",
  normal: "normal",
  high: "high",
  urgent: "urgent"
});

export const priorityValues = Object.freeze(Object.values(priorityLevels));

export const priorityDefinitions = Object.freeze({
  [priorityLevels.low]: {
    label: "Low",
    responseTargetMinutes: 1440,
    description: "General guidance or low-risk question without immediate user impact"
  },
  [priorityLevels.normal]: {
    label: "Normal",
    responseTargetMinutes: 480,
    description: "Standard support request with clear context and limited business or customer risk"
  },
  [priorityLevels.high]: {
    label: "High",
    responseTargetMinutes: 120,
    description: "Billing, access, expert complaint, mixed topic, or bug report with meaningful user impact"
  },
  [priorityLevels.urgent]: {
    label: "Urgent",
    responseTargetMinutes: 30,
    description: "Security, privacy, legal, safety, data loss, major outage, or severe financial impact"
  }
});

export const automationEligibility = Object.freeze({
  safeToSuggest: "safe_to_suggest",
  humanReviewRequired: "human_review_required",
  automationBlocked: "automation_blocked"
});

export const automationEligibilityValues = Object.freeze(Object.values(automationEligibility));

export const reviewReasons = Object.freeze({
  lowConfidence: "low_confidence",
  blockedCategory: "blocked_category",
  policySensitiveCategory: "policy_sensitive_category",
  urgentPriority: "urgent_priority",
  mixedTopics: "mixed_topics",
  unclearIntent: "unclear_intent",
  aggressiveTone: "aggressive_tone",
  legalOrPrivacyRisk: "legal_or_privacy_risk",
  safetyRisk: "safety_risk",
  financialDecision: "financial_decision",
  missingKnowledgeCitation: "missing_knowledge_citation"
});

export const reviewReasonValues = Object.freeze(Object.values(reviewReasons));

const blockedCategories = new Set([
  ticketCategories.refundRequest,
  ticketCategories.accountAccess,
  ticketCategories.unknown
]);

const humanReviewCategories = new Set([
  ticketCategories.bug,
  ticketCategories.expertComplaint,
  ticketCategories.billing,
  ticketCategories.mixed
]);

const blockedSignals = new Set([
  reviewReasons.legalOrPrivacyRisk,
  reviewReasons.safetyRisk,
  reviewReasons.financialDecision
]);

export function resolveAutomationPolicy(input) {
  const category = input.category;
  const priority = input.priority;
  const confidence = Number(input.confidence ?? 0);
  const signals = new Set(input.signals ?? []);
  const reasons = new Set(input.reviewReasons ?? []);

  if (confidence < 0.75) {
    reasons.add(reviewReasons.lowConfidence);
  }

  if (blockedCategories.has(category)) {
    reasons.add(reviewReasons.blockedCategory);
  }

  if (humanReviewCategories.has(category)) {
    reasons.add(reviewReasons.policySensitiveCategory);
  }

  if (category === ticketCategories.mixed) {
    reasons.add(reviewReasons.mixedTopics);
  }

  if (priority === priorityLevels.urgent) {
    reasons.add(reviewReasons.urgentPriority);
  }

  for (const signal of signals) {
    reasons.add(signal);
  }

  const hasBlockingReason =
    blockedCategories.has(category) ||
    priority === priorityLevels.urgent ||
    [...signals].some((signal) => blockedSignals.has(signal));

  if (hasBlockingReason) {
    return {
      eligibility: automationEligibility.automationBlocked,
      reviewReasons: [...reasons]
    };
  }

  if (reasons.size > 0) {
    return {
      eligibility: automationEligibility.humanReviewRequired,
      reviewReasons: [...reasons]
    };
  }

  return {
    eligibility: automationEligibility.safeToSuggest,
    reviewReasons: []
  };
}
