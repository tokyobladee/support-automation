import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describePromptRun,
  getPromptRegistration,
  hashPromptMessages,
  promptPurposes
} from "./prompt-registry.js";

describe("prompt registry", () => {
  it("describes registered prompt runs with stable hashes", () => {
    const prompt = {
      version: "ticket-classification.v1",
      messages: [
        {
          role: "system",
          content: "Classify support tickets."
        }
      ]
    };

    const descriptor = describePromptRun({
      prompt,
      providerName: "mock",
      model: "mock-ticket-classifier-v1"
    });

    assert.equal(descriptor.purpose, promptPurposes.ticketClassification);
    assert.equal(descriptor.schemaName, "classificationResponseSchema");
    assert.equal(descriptor.promptHash, hashPromptMessages(prompt.messages));
  });

  it("rejects unregistered prompt versions", () => {
    assert.throws(() => getPromptRegistration("unknown"), /Prompt version is not registered/);
  });
});
