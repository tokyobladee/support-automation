import { automationEligibility, priorityLevels, reviewReasons, ticketCategories } from "@support/domain";

const keywordRules = [
  {
    category: ticketCategories.refundRequest,
    priority: priorityLevels.high,
    keywords: ["refund", "money back", "chargeback", "повернення", "поверните", "компенсац"],
    reviewReasons: [reviewReasons.financialDecision]
  },
  {
    category: ticketCategories.accountAccess,
    priority: priorityLevels.high,
    keywords: ["login", "password", "account", "email change", "не можу увійти", "не могу войти"],
    reviewReasons: [reviewReasons.policySensitiveCategory]
  },
  {
    category: ticketCategories.bug,
    priority: priorityLevels.high,
    keywords: ["bug", "error", "crash", "broken", "не працює", "ошибка", "сломалось"],
    reviewReasons: [reviewReasons.policySensitiveCategory]
  },
  {
    category: ticketCategories.expertComplaint,
    priority: priorityLevels.high,
    keywords: ["expert", "rude", "wrong advice", "complaint", "експерт", "эксперт"],
    reviewReasons: [reviewReasons.policySensitiveCategory]
  },
  {
    category: ticketCategories.billing,
    priority: priorityLevels.normal,
    keywords: ["invoice", "payment", "billing", "charged", "оплата", "счет", "рахунок"],
    reviewReasons: [reviewReasons.policySensitiveCategory]
  },
  {
    category: ticketCategories.subscription,
    priority: priorityLevels.normal,
    keywords: ["subscription", "plan", "cancel", "renewal", "підписк", "подписк"],
    reviewReasons: []
  },
  {
    category: ticketCategories.productGuidance,
    priority: priorityLevels.low,
    keywords: ["how do i", "how to", "where can i", "як", "как"],
    reviewReasons: []
  }
];

export class MockTicketClassifierProvider {
  constructor() {
    this.name = "mock";
    this.model = "mock-ticket-classifier-v1";
  }

  async classifyTicket({ request }) {
    const text = `${request.subject ?? ""} ${request.text}`.toLowerCase();
    const matches = keywordRules.filter((rule) =>
      rule.keywords.some((keyword) => text.includes(keyword))
    );

    if (matches.length > 1) {
      return this.buildResult({
        category: ticketCategories.mixed,
        priority: priorityLevels.high,
        confidence: 0.72,
        recommendedNextStep: "Route to a support agent for manual triage because multiple topics are present.",
        rationale: "The ticket contains signals from multiple support categories.",
        reviewReasons: [reviewReasons.mixedTopics],
        quote: request.text.slice(0, 180)
      });
    }

    const match = matches[0];

    if (!match) {
      return this.buildResult({
        category: ticketCategories.unknown,
        priority: priorityLevels.normal,
        confidence: 0.54,
        recommendedNextStep: "Ask the customer for more details before taking action.",
        rationale: "The ticket does not contain enough reliable category signals.",
        reviewReasons: [reviewReasons.unclearIntent],
        quote: request.text.slice(0, 180)
      });
    }

    return this.buildResult({
      category: match.category,
      priority: match.priority,
      confidence: 0.86,
      recommendedNextStep: this.nextStepFor(match.category),
      rationale: `The ticket matches the ${match.category} support category.`,
      reviewReasons: match.reviewReasons,
      quote: request.text.slice(0, 180)
    });
  }

  buildResult(input) {
    return {
      category: input.category,
      priority: input.priority,
      automationEligibility: automationEligibility.safeToSuggest,
      confidence: input.confidence,
      recommendedNextStep: input.recommendedNextStep,
      rationale: input.rationale,
      reviewReasons: input.reviewReasons,
      evidence: [
        {
          quote: input.quote || "No direct quote available",
          reason: "Matched support-triage signal"
        }
      ]
    };
  }

  nextStepFor(category) {
    const nextSteps = {
      [ticketCategories.subscription]: "Send subscription self-service guidance and offer agent help if the user is blocked.",
      [ticketCategories.bug]: "Collect reproduction steps, device details, screenshots, and route to technical review.",
      [ticketCategories.expertComplaint]: "Escalate to expert quality review and acknowledge the customer's experience.",
      [ticketCategories.refundRequest]: "Send to a human agent for refund-policy review.",
      [ticketCategories.accountAccess]: "Route to account support and verify ownership before changes.",
      [ticketCategories.billing]: "Review billing records and provide invoice or payment status guidance.",
      [ticketCategories.productGuidance]: "Provide concise product instructions with a relevant help-center reference."
    };

    return nextSteps[category] ?? "Route to a support agent for manual review.";
  }
}
