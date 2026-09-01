import { classificationResponseSchema, copilotDraftResponseSchema } from "@support/contracts";
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

const copilotDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "replyVariants", "reviewReasons"],
  properties: {
    summary: {
      type: "string"
    },
    replyVariants: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tone", "subject", "body", "citationChunkIds"],
        properties: {
          tone: {
            type: "string",
            enum: ["formal", "empathetic", "concise"]
          },
          subject: {
            type: "string"
          },
          body: {
            type: "string"
          },
          citationChunkIds: {
            type: "array",
            items: {
              type: "string"
            }
          }
        }
      }
    },
    reviewReasons: {
      type: "array",
      items: {
        type: "string",
        enum: reviewReasonValues
      }
    }
  }
};

export class GeminiTicketClassifierProvider {
  constructor({
    apiKey,
    model = "gemini-2.5-flash",
    fetchImpl = globalThis.fetch,
    endpoint = "https://generativelanguage.googleapis.com/v1/interactions"
  }) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER is gemini");
    }

    if (!fetchImpl) {
      throw new Error("A fetch implementation is required for Gemini provider");
    }

    this.name = "gemini";
    this.model = model;
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
  }

  async classifyTicket({ prompt }) {
    const parsed = await this.requestStructuredOutput({
      prompt,
      schema: classificationJsonSchema,
      errorLabel: "classification"
    });

    return classificationResponseSchema.parse(parsed);
  }

  async generateReplyVariants({ prompt }) {
    const parsed = await this.requestStructuredOutput({
      prompt,
      schema: copilotDraftJsonSchema,
      errorLabel: "copilot draft"
    });

    return copilotDraftResponseSchema.parse(parsed);
  }

  async requestStructuredOutput({ prompt, schema, errorLabel }) {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        input: toInput(prompt),
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini ${errorLabel} request failed with status ${response.status}`);
    }

    const payload = await response.json();

    return parseGeminiStructuredOutput(payload);
  }
}

export function parseGeminiStructuredOutput(payload) {
  const text =
    payload.output_text ??
    payload.interaction?.output_text ??
    payload.interaction?.outputText ??
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("");

  if (!text) {
    throw new Error("Gemini response did not include structured output text");
  }

  return JSON.parse(text);
}

function toInput(prompt) {
  return prompt.messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
}
