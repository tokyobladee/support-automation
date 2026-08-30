export const seedKnowledgeDocuments = Object.freeze([
  {
    title: "Subscription Cancellation Playbook",
    source: "support-playbook",
    sourceUri: "https://internal.example.com/support/subscription-cancellation",
    version: "2026-08",
    language: "en",
    visibility: "public_safe",
    tags: ["subscription", "self-service"],
    content:
      "Customers can cancel subscriptions from Account Settings before the renewal date. Agents may provide self-service navigation steps and ask whether the customer wants help finding the cancellation page. Agents must not promise a refund when cancellation happens after renewal."
  },
  {
    title: "Refund And Chargeback Policy",
    source: "policy",
    sourceUri: "https://internal.example.com/policies/refunds",
    version: "2026-08",
    language: "en",
    visibility: "agent_only",
    tags: ["refunds", "billing", "human-review"],
    content:
      "Refund requests, chargeback threats, compensation decisions, and billing reversals require a human agent. AI may summarize the customer request and cite policy, but it must not approve money movement or state that a refund is guaranteed."
  },
  {
    title: "Bug Report Intake",
    source: "support-playbook",
    sourceUri: "https://internal.example.com/support/bug-intake",
    version: "2026-08",
    language: "en",
    visibility: "internal",
    tags: ["bugs", "technical-troubleshooting"],
    content:
      "For crashes, errors, broken flows, or upload failures, collect the device, operating system, app version, reproduction steps, screenshots, and customer impact. Bugs with payments, data loss, privacy risk, or security impact must be escalated before any workaround is promised."
  },
  {
    title: "Expert Complaint Escalation",
    source: "quality-playbook",
    sourceUri: "https://internal.example.com/support/expert-complaints",
    version: "2026-08",
    language: "en",
    visibility: "agent_only",
    tags: ["experts", "quality", "escalation"],
    content:
      "Complaints about expert tone, rude behavior, wrong advice, delays, or professional conduct go to expert quality review. The agent should acknowledge the experience, avoid judging the expert before review, and collect the session ID or conversation timestamp."
  },
  {
    title: "Account Access And Privacy Handling",
    source: "policy",
    sourceUri: "https://internal.example.com/policies/account-access",
    version: "2026-08",
    language: "en",
    visibility: "agent_only",
    tags: ["account-access", "privacy", "human-review"],
    content:
      "Login recovery, password reset failures, email changes, account ownership questions, data export, and data deletion require identity verification. AI must not disclose stored personal data or confirm ownership without a verified human workflow."
  }
]);
