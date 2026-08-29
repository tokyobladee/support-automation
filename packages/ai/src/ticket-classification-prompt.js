import { priorityDefinitions, ticketCategoryDefinitions } from "@support/domain";

function formatDefinitions(definitions) {
  return Object.entries(definitions)
    .map(([key, definition]) => `${key}: ${definition.description}`)
    .join("\n");
}

export function buildTicketClassificationPrompt(request) {
  return {
    version: "ticket-classification.v1",
    messages: [
      {
        role: "system",
        content: [
          "You classify customer support tickets for an internal support automation platform.",
          "Return only structured data matching the provided schema.",
          "Use conservative judgment when the ticket is ambiguous, mixed, policy-sensitive, aggressive, legal, privacy-related, safety-related, or financial.",
          "Never decide refunds, compensation, account ownership, legal, privacy, safety, abuse, fraud, or urgent bug outcomes automatically.",
          "Prefer human review when confidence is low or a policy-sensitive category is involved."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          "Classify this ticket.",
          "",
          "Categories:",
          formatDefinitions(ticketCategoryDefinitions),
          "",
          "Priorities:",
          formatDefinitions(priorityDefinitions),
          "",
          `Source: ${request.source}`,
          request.subject ? `Subject: ${request.subject}` : "Subject: none",
          "",
          "Ticket text:",
          request.text
        ].join("\n")
      }
    ]
  };
}
