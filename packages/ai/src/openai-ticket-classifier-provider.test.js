import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  automationEligibility,
  priorityLevels,
  ticketCategories
} from "@support/domain";
import {
  OpenAiTicketClassifierProvider,
  parseOpenAiStructuredOutput
} from "./openai-ticket-classifier-provider.js";
import { buildTicketClassificationPrompt } from "./ticket-classification-prompt.js";

const validClassification = {
  category: ticketCategories.subscription,
  priority: priorityLevels.normal,
  automationEligibility: automationEligibility.safeToSuggest,
  confidence: 0.91,
  recommendedNextStep: "Send cancellation guidance and offer help if the flow is blocked.",
  rationale: "The customer asks how to cancel a subscription before renewal.",
  reviewReasons: [],
  evidence: [
    {
      quote: "I want to cancel my subscription before renewal.",
      reason: "Direct subscription cancellation request"
    }
  ]
};

const validCopilotDraft = {
  summary: "The customer wants to cancel before renewal.",
  replyVariants: [
    {
      tone: "formal",
      subject: "Subscription cancellation",
      body: "Hello, you can cancel from Account Settings before renewal.",
      citationChunkIds: ["chunk-subscription"]
    },
    {
      tone: "empathetic",
      subject: "Subscription cancellation",
      body: "Hi, I understand you want to avoid another renewal charge.",
      citationChunkIds: ["chunk-subscription"]
    },
    {
      tone: "concise",
      subject: "Subscription cancellation",
      body: "Hi, go to Account Settings to cancel before renewal.",
      citationChunkIds: ["chunk-subscription"]
    }
  ],
  reviewReasons: []
};

describe("OpenAiTicketClassifierProvider", () => {
  it("sends a structured output request and parses the classification", async () => {
    let capturedRequest;
    const provider = new OpenAiTicketClassifierProvider({
      apiKey: "test-key",
      model: "test-model",
      fetchImpl: async (url, request) => {
        capturedRequest = {
          url,
          request,
          body: JSON.parse(request.body)
        };

        return {
          ok: true,
          json: async () => ({
            output_text: JSON.stringify(validClassification)
          })
        };
      }
    });

    const prompt = buildTicketClassificationPrompt({
      text: "I want to cancel my subscription before renewal.",
      source: "manual"
    });

    const result = await provider.classifyTicket({
      prompt
    });

    assert.equal(result.category, ticketCategories.subscription);
    assert.equal(capturedRequest.url, "https://api.openai.com/v1/responses");
    assert.equal(capturedRequest.request.headers.Authorization, "Bearer test-key");
    assert.equal(capturedRequest.body.model, "test-model");
    assert.equal(capturedRequest.body.text.format.type, "json_schema");
    assert.equal(capturedRequest.body.text.format.strict, true);
    assert.equal(capturedRequest.body.text.format.schema.additionalProperties, false);
  });

  it("fails without an API key", () => {
    assert.throws(
      () =>
        new OpenAiTicketClassifierProvider({
          apiKey: ""
        }),
      /OPENAI_API_KEY/
    );
  });

  it("fails when OpenAI returns a non-success response", async () => {
    const provider = new OpenAiTicketClassifierProvider({
      apiKey: "test-key",
      fetchImpl: async () => ({
        ok: false,
        status: 429
      })
    });

    await assert.rejects(
      () =>
        provider.classifyTicket({
          prompt: buildTicketClassificationPrompt({
            text: "Can you help?",
            source: "manual"
          })
        }),
      /status 429/
    );
  });

  it("sends a structured copilot draft request", async () => {
    let capturedRequest;
    const provider = new OpenAiTicketClassifierProvider({
      apiKey: "test-key",
      model: "test-model",
      fetchImpl: async (url, request) => {
        capturedRequest = {
          url,
          request,
          body: JSON.parse(request.body)
        };

        return {
          ok: true,
          json: async () => ({
            output_text: JSON.stringify(validCopilotDraft)
          })
        };
      }
    });

    const result = await provider.generateReplyVariants({
      prompt: {
        messages: [
          {
            role: "system",
            content: "Draft replies."
          },
          {
            role: "user",
            content: "Ticket context."
          }
        ]
      }
    });

    assert.equal(result.replyVariants.length, 3);
    assert.equal(capturedRequest.url, "https://api.openai.com/v1/responses");
    assert.equal(capturedRequest.body.text.format.name, "copilot_draft");
    assert.equal(capturedRequest.body.text.format.schema.additionalProperties, false);
  });
});

describe("parseOpenAiStructuredOutput", () => {
  it("parses nested response content", () => {
    const result = parseOpenAiStructuredOutput({
      output: [
        {
          content: [
            {
              text: JSON.stringify(validClassification)
            }
          ]
        }
      ]
    });

    assert.equal(result.category, ticketCategories.subscription);
  });
});
