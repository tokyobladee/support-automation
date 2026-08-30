export function buildCopilotPrompt({ request, classification, citations }) {
  return {
    version: "agent-copilot.v1",
    messages: [
      {
        role: "system",
        content: [
          "You support internal customer support agents.",
          "Summarize the ticket and draft reply variants in formal, empathetic, and concise tones.",
          "Use only provided knowledge citations for policy or process claims.",
          "Do not promise refunds, compensation, account ownership changes, legal outcomes, privacy actions, or bug fixes.",
          "Return only structured data matching the provided schema.",
          "Set review reasons when citations are missing, risk is high, or human judgment is required."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          "Prepare an internal copilot response for this ticket.",
          "",
          `Source: ${request.source}`,
          request.subject ? `Subject: ${request.subject}` : "Subject: none",
          "",
          "Ticket text:",
          request.text,
          "",
          "Classification:",
          JSON.stringify(classification),
          "",
          "Available citations:",
          JSON.stringify(citations)
        ].join("\n")
      }
    ]
  };
}
