import { createHash } from "node:crypto";

export const promptPurposes = Object.freeze({
  ticketClassification: "ticket_classification",
  replyGeneration: "reply_generation"
});

export const promptRegistry = Object.freeze([
  {
    purpose: promptPurposes.ticketClassification,
    version: "ticket-classification.v1",
    schemaName: "classificationResponseSchema"
  },
  {
    purpose: promptPurposes.replyGeneration,
    version: "agent-copilot.v1",
    schemaName: "copilotDraftResponseSchema"
  }
]);

export function getPromptRegistration(version) {
  const registration = promptRegistry.find((prompt) => prompt.version === version);

  if (!registration) {
    throw new Error(`Prompt version is not registered: ${version}`);
  }

  return registration;
}

export function describePromptRun({ prompt, providerName, model }) {
  const registration = getPromptRegistration(prompt.version);

  return {
    ...registration,
    provider: providerName,
    model,
    promptHash: hashPromptMessages(prompt.messages)
  };
}

export function hashPromptMessages(messages) {
  return createHash("sha256").update(JSON.stringify(messages)).digest("hex");
}
