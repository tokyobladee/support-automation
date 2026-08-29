import { classificationRequestSchema, classificationResponseSchema } from "@support/contracts";
import { resolveAutomationPolicy } from "@support/domain";
import { buildTicketClassificationPrompt } from "./ticket-classification-prompt.js";

export class TicketClassificationService {
  constructor({ provider, repository, maxAttempts = 2, clock = () => new Date() }) {
    this.provider = provider;
    this.repository = repository;
    this.maxAttempts = maxAttempts;
    this.clock = clock;
  }

  async classify(input) {
    const request = classificationRequestSchema.parse(input);
    const prompt = buildTicketClassificationPrompt(request);
    const startedAt = this.clock();
    const output = await this.runWithRetry({ request, prompt });
    const parsed = classificationResponseSchema.parse(output);
    const policy = resolveAutomationPolicy({
      category: parsed.category,
      priority: parsed.priority,
      confidence: parsed.confidence,
      reviewReasons: parsed.reviewReasons
    });
    const classification = {
      ...parsed,
      automationEligibility: policy.eligibility,
      reviewReasons: policy.reviewReasons
    };
    const result = {
      request,
      classification,
      aiRun: {
        provider: this.provider.name,
        model: this.provider.model,
        promptVersion: prompt.version,
        startedAt,
        finishedAt: this.clock()
      }
    };

    if (this.repository) {
      await this.repository.saveClassification(result);
    }

    return result;
  }

  async runWithRetry({ request, prompt }) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const output = await this.provider.classifyTicket({
          request,
          prompt,
          attempt
        });

        return classificationResponseSchema.parse(output);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }
}
