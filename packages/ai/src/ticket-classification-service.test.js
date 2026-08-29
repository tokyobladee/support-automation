import { describe, expect, it } from "vitest";
import { automationEligibility, ticketCategories } from "@support/domain";
import { InMemoryClassificationRepository } from "./in-memory-classification-repository.js";
import { MockTicketClassifierProvider } from "./mock-ticket-classifier-provider.js";
import { TicketClassificationService } from "./ticket-classification-service.js";

describe("TicketClassificationService", () => {
  it("classifies a subscription ticket and persists the result", async () => {
    const repository = new InMemoryClassificationRepository();
    const service = new TicketClassificationService({
      provider: new MockTicketClassifierProvider(),
      repository
    });

    const result = await service.classify({
      text: "I want to cancel my subscription before renewal.",
      source: "manual"
    });

    expect(result.classification.category).toBe(ticketCategories.subscription);
    expect(result.classification.automationEligibility).toBe(automationEligibility.safeToSuggest);
    expect(repository.all()).toHaveLength(1);
  });

  it("overrides unsafe provider eligibility with domain policy", async () => {
    const service = new TicketClassificationService({
      provider: new MockTicketClassifierProvider()
    });

    const result = await service.classify({
      text: "I want a refund because my payment was wrong.",
      source: "manual"
    });

    expect(result.classification.category).toBe(ticketCategories.refundRequest);
    expect(result.classification.automationEligibility).toBe(
      automationEligibility.automationBlocked
    );
  });
});
