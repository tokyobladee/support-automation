import {
  classificationResponseSchema,
  copilotDraftResponseSchema,
  replyToneValues
} from "@support/contracts";
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
            enum: replyToneValues
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
    const parsed = await this.requestStructuredOutput({
      prompt,
      schemaName: "ticket_classification",
      schema: classificationJsonSchema,
      errorLabel: "classification"
    });

    return classificationResponseSchema.parse(parsed);
  }

  async generateReplyVariants({ prompt }) {
    const parsed = await this.requestStructuredOutput({
      prompt,
      schemaName: "copilot_draft",
      schema: copilotDraftJsonSchema,
      errorLabel: "copilot draft"
    });

    return copilotDraftResponseSchema.parse(parsed);
  }

  async requestStructuredOutput({ prompt, schemaName, schema, errorLabel }) {
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
            name: schemaName,
            strict: true,
            schema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI ${errorLabel} request failed with status ${response.status}`);
    }

    const payload = await response.json();

    return parseOpenAiStructuredOutput(payload);
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
