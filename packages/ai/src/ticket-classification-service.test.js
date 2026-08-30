import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

    assert.equal(result.classification.category, ticketCategories.subscription);
    assert.equal(result.classification.automationEligibility, automationEligibility.safeToSuggest);
    assert.equal(repository.all().length, 1);
  });

  it("overrides unsafe provider eligibility with domain policy", async () => {
    const service = new TicketClassificationService({
      provider: new MockTicketClassifierProvider()
    });

    const result = await service.classify({
      text: "I want a refund because my payment was wrong.",
      source: "manual"
    });

    assert.equal(result.classification.category, ticketCategories.refundRequest);
    assert.equal(result.classification.automationEligibility, automationEligibility.automationBlocked);
  });
});
