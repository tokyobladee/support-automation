import { classificationResponseSchema } from "@support/contracts";
import {
  automationEligibilityValues,
  priorityValues,
  reviewReasonValues,
  ticketCategoryValues
} from "@support/domain";

const classificationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "category",
    "priority",
    "automationEligibility",
    "confidence",
    "recommendedNextStep",
    "rationale",
    "reviewReasons",
    "evidence"
  ],
  properties: {
    category: {
      type: "string",
      enum: ticketCategoryValues
    },
    priority: {
      type: "string",
      enum: priorityValues
    },
    automationEligibility: {
      type: "string",
      enum: automationEligibilityValues
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    recommendedNextStep: {
      type: "string"
    },
    rationale: {
      type: "string"
    },
    reviewReasons: {
      type: "array",
      items: {
        type: "string",
        enum: reviewReasonValues
      }
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quote", "reason"],
        properties: {
          quote: {
            type: "string"
          },
          reason: {
            type: "string"
          }
        }
      }
    }
  }
};

export class OpenAiTicketClassifierProvider {
  constructor({
    apiKey,
    model = "gpt-5.6",
    fetchImpl = globalThis.fetch,
    endpoint = "https://api.openai.com/v1/responses"
  }) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when AI_PROVIDER is openai");
    }

    if (!fetchImpl) {
      throw new Error("A fetch implementation is required for OpenAI provider");
    }

    this.name = "openai";
    this.model = model;
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
  }

  async classifyTicket({ prompt }) {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        input: prompt.messages,
        text: {
          format: {
            type: "json_schema",
            name: "ticket_classification",
            strict: true,
            schema: classificationJsonSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI classification request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const parsed = parseOpenAiStructuredOutput(payload);

    return classificationResponseSchema.parse(parsed);
  }
}

export function parseOpenAiStructuredOutput(payload) {
  if (typeof payload.output_text === "string") {
    return JSON.parse(payload.output_text);
  }

  for (const outputItem of payload.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (typeof contentItem.text === "string") {
        return JSON.parse(contentItem.text);
      }
    }
  }

  throw new Error("OpenAI response did not include structured output text");
}
