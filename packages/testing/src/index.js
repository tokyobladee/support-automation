import { automationEligibility, priorityLevels, ticketCategories } from "@support/domain";
export { evaluateCopilot } from "./copilot-evaluator.js";
export { evaluateClassifier } from "./classification-evaluator.js";

export const syntheticTicketSeeds = Object.freeze([
  {
    id: "subscription-cancel-en",
    input: {
      text: "Please cancel my subscription before the next renewal.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.subscription,
      priority: priorityLevels.normal,
      automationEligibility: automationEligibility.safeToSuggest
    },
    tags: ["english", "subscription"]
  },
  {
    id: "subscription-upgrade-en",
    input: {
      text: "How do I upgrade my plan from monthly to annual?",
      source: "manual"
    },
    expected: {
      category: ticketCategories.mixed,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["english", "mixed", "subscription", "guidance"]
  },
  {
    id: "subscription-uk",
    input: {
      text: "Хочу скасувати підписку, але не бачу цієї опції в акаунті.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.subscription,
      priority: priorityLevels.normal,
      automationEligibility: automationEligibility.safeToSuggest
    },
    tags: ["ukrainian", "subscription"]
  },
  {
    id: "bug-crash-en",
    input: {
      text: "The app crashes when I open the expert chat after uploading a file.",
      source: "webhook"
    },
    expected: {
      category: ticketCategories.bug,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["english", "bug"]
  },
  {
    id: "bug-ru",
    input: {
      text: "После обновления приложение сломалось и показывает ошибка 500.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.bug,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["russian", "bug"]
  },
  {
    id: "expert-complaint-en",
    input: {
      text: "The expert was rude and gave wrong advice about my case.",
      source: "crm"
    },
    expected: {
      category: ticketCategories.expertComplaint,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["english", "expert_complaint", "tone"]
  },
  {
    id: "expert-complaint-uk",
    input: {
      text: "Експерт відповів грубо і не допоміг вирішити питання.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.expertComplaint,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["ukrainian", "expert_complaint"]
  },
  {
    id: "refund-en",
    input: {
      text: "I want a refund because I was charged after cancellation.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.refundRequest,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.automationBlocked
    },
    tags: ["english", "refund", "financial"]
  },
  {
    id: "refund-uk",
    input: {
      text: "Прошу повернення коштів, бо підписка списала гроші без попередження.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.refundRequest,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.automationBlocked
    },
    tags: ["ukrainian", "refund", "financial"]
  },
  {
    id: "refund-ru-aggressive",
    input: {
      text: "Верните деньги сейчас же, иначе я буду жаловаться везде.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.refundRequest,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.automationBlocked
    },
    tags: ["russian", "refund", "aggressive", "financial"]
  },
  {
    id: "account-login-en",
    input: {
      text: "I cannot login because my password reset email never arrives.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.accountAccess,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.automationBlocked
    },
    tags: ["english", "account_access"]
  },
  {
    id: "account-uk",
    input: {
      text: "Не можу увійти в акаунт після зміни email.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.accountAccess,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.automationBlocked
    },
    tags: ["ukrainian", "account_access"]
  },
  {
    id: "billing-invoice-en",
    input: {
      text: "Where can I download an invoice for last month's payment?",
      source: "manual"
    },
    expected: {
      category: ticketCategories.billing,
      priority: priorityLevels.normal,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["english", "billing"]
  },
  {
    id: "billing-ru",
    input: {
      text: "Мне нужен счет и подтверждение оплаты за прошлый месяц.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.billing,
      priority: priorityLevels.normal,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["russian", "billing"]
  },
  {
    id: "guidance-en",
    input: {
      text: "How do I invite another teammate to the workspace?",
      source: "manual"
    },
    expected: {
      category: ticketCategories.productGuidance,
      priority: priorityLevels.low,
      automationEligibility: automationEligibility.safeToSuggest
    },
    tags: ["english", "guidance"]
  },
  {
    id: "guidance-uk",
    input: {
      text: "Як змінити мову інтерфейсу в налаштуваннях?",
      source: "manual"
    },
    expected: {
      category: ticketCategories.productGuidance,
      priority: priorityLevels.low,
      automationEligibility: automationEligibility.safeToSuggest
    },
    tags: ["ukrainian", "guidance"]
  },
  {
    id: "mixed-refund-login-en",
    input: {
      text: "I cannot login, my subscription renewed today, and I want my money back.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.mixed,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["english", "mixed", "refund", "account_access"]
  },
  {
    id: "mixed-bug-billing-uk",
    input: {
      text: "Після оплати сервіс не працює, а рахунок все одно списали.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.mixed,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["ukrainian", "mixed", "bug", "billing"]
  },
  {
    id: "ambiguous-short",
    input: {
      text: "Help please",
      source: "manual"
    },
    expected: {
      category: ticketCategories.unknown,
      priority: priorityLevels.normal,
      automationEligibility: automationEligibility.automationBlocked
    },
    tags: ["english", "ambiguous", "short"]
  },
  {
    id: "non-english-spanish-guidance",
    input: {
      text: "Como puedo cambiar mi plan?",
      source: "manual"
    },
    expected: {
      category: ticketCategories.productGuidance,
      priority: priorityLevels.low,
      automationEligibility: automationEligibility.safeToSuggest
    },
    tags: ["spanish", "non_english", "guidance"]
  },
  {
    id: "privacy-risk-en",
    input: {
      text: "Delete all my personal data and send me everything you store about my account.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.accountAccess,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.automationBlocked
    },
    tags: ["english", "privacy", "human_judgment"]
  },
  {
    id: "safety-aggressive-en",
    input: {
      text: "Your expert ruined everything and I am going to report this unless someone fixes it now.",
      source: "manual"
    },
    expected: {
      category: ticketCategories.expertComplaint,
      priority: priorityLevels.high,
      automationEligibility: automationEligibility.humanReviewRequired
    },
    tags: ["english", "aggressive", "expert_complaint"]
  }
]);

export const syntheticTicketSummary = Object.freeze({
  total: syntheticTicketSeeds.length,
  languages: ["english", "ukrainian", "russian", "spanish"],
  edgeCases: ["aggressive", "mixed", "ambiguous", "privacy", "financial", "non_english"]
});

export const copilotEvaluationSeeds = Object.freeze([
  {
    id: "copilot-refund-policy",
    input: {
      text: "I was charged after cancellation and want a refund.",
      source: "manual",
      subject: "Refund after cancellation"
    },
    expected: {
      tones: ["formal", "empathetic", "concise"],
      requiresCitation: true,
      automationEligibility: automationEligibility.automationBlocked,
      reviewReasons: ["financial_decision"]
    },
    tags: ["refund", "financial", "human_judgment"]
  },
  {
    id: "copilot-bug-intake",
    input: {
      text: "The app crashes when I upload a file into expert chat.",
      source: "webhook",
      subject: "Crash on file upload"
    },
    expected: {
      tones: ["formal", "empathetic", "concise"],
      requiresCitation: true,
      automationEligibility: automationEligibility.humanReviewRequired,
      reviewReasons: ["policy_sensitive_category"]
    },
    tags: ["bug", "technical_review"]
  },
  {
    id: "copilot-expert-complaint",
    input: {
      text: "The expert was rude and gave wrong advice about my case.",
      source: "crm",
      subject: "Expert complaint"
    },
    expected: {
      tones: ["formal", "empathetic", "concise"],
      requiresCitation: true,
      automationEligibility: automationEligibility.humanReviewRequired,
      reviewReasons: ["policy_sensitive_category"]
    },
    tags: ["expert_complaint", "quality_review"]
  },
  {
    id: "copilot-product-guidance",
    input: {
      text: "How do I invite another teammate to the workspace?",
      source: "manual",
      subject: "Invite teammate"
    },
    expected: {
      tones: ["formal", "empathetic", "concise"],
      requiresCitation: true,
      automationEligibility: automationEligibility.safeToSuggest,
      reviewReasons: []
    },
    tags: ["guidance", "safe_to_suggest"]
  }
]);

export const copilotEvaluationSummary = Object.freeze({
  total: copilotEvaluationSeeds.length,
  requiredTones: ["formal", "empathetic", "concise"],
  edgeCases: ["financial", "technical_review", "quality_review", "safe_to_suggest"]
});
