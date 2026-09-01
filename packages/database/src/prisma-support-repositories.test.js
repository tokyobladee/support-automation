import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FeedbackDraftNotFoundError,
  PrismaAgentFeedbackRepository,
  PrismaClassificationRepository,
  PrismaSupportContext
} from "./prisma-support-repositories.js";

const sampleRequest = Object.freeze({
  text: "I was charged twice and want a refund.",
  source: "manual",
  customerId: "customer-1",
  externalId: "ticket-1",
  subject: "Duplicate charge"
});

const sampleClassification = Object.freeze({
  category: "refund_request",
  priority: "high",
  automationEligibility: "automation_blocked",
  confidence: 0.92,
  recommendedNextStep: "Route to billing review.",
  rationale: "The customer is asking for a refund.",
  reviewReasons: ["financial_decision"],
  evidence: [
    {
      quote: "charged twice",
      reason: "Potential duplicate billing"
    }
  ]
});

describe("PrismaClassificationRepository", () => {
  it("persists ticket, classification, ai run, and audit event through Prisma delegates", async () => {
    const calls = [];
    const context = new PrismaSupportContext({
      prisma: createFakePrisma(calls),
      idFactory: createIdFactory()
    });
    const repository = new PrismaClassificationRepository({ context });

    await repository.saveClassification({
      request: sampleRequest,
      classification: sampleClassification,
      aiRun: {
        provider: "mock",
        model: "mock-support-model",
        promptVersion: "ticket-classification-v1",
        startedAt: new Date("2026-08-30T10:00:00.000Z"),
        finishedAt: new Date("2026-08-30T10:00:01.000Z")
      }
    });

    assert.deepEqual(
      calls.map((call) => call.delegate),
      ["organization.upsert", "ticket.upsert", "classification.create", "aiRun.create", "auditEvent.create"]
    );
    assert.equal(calls[2].args.data.category, "refund_request");
    assert.equal(calls[3].args.data.purpose, "ticket_classification");
    assert.equal(calls[4].args.data.type, "ticket_classified");
  });
});

describe("PrismaAgentFeedbackRepository", () => {
  it("throws a domain-specific error when draft feedback cannot be linked", async () => {
    const repository = new PrismaAgentFeedbackRepository({
      context: new PrismaSupportContext({
        prisma: createFakePrisma([], {
          draft: undefined
        }),
        idFactory: createIdFactory()
      })
    });

    await assert.rejects(
      () =>
        repository.saveFeedback({
          draftId: "missing-draft",
          decision: "marked_bad_output",
          reason: "No matching AI run"
        }),
      FeedbackDraftNotFoundError
    );
  });
});

function createFakePrisma(calls, overrides = {}) {
  const organization = {
    id: "org-1",
    slug: "default-support",
    name: "Default Support Organization"
  };
  const agent = {
    id: "user-1",
    organizationId: "org-1",
    email: "agent@example.com",
    name: "Support Agent",
    role: "agent"
  };

  return {
    organization: {
      upsert: async (args) => {
        calls.push({
          delegate: "organization.upsert",
          args
        });
        return organization;
      }
    },
    user: {
      upsert: async (args) => {
        calls.push({
          delegate: "user.upsert",
          args
        });
        return agent;
      }
    },
    ticket: {
      upsert: async (args) => {
        calls.push({
          delegate: "ticket.upsert",
          args
        });
        return {
          id: "ticket-db-1",
          organizationId: organization.id,
          ...args.create
        };
      },
      create: async (args) => {
        calls.push({
          delegate: "ticket.create",
          args
        });
        return {
          id: "ticket-db-1",
          organizationId: organization.id,
          ...args.data
        };
      }
    },
    classification: {
      create: async (args) => {
        calls.push({
          delegate: "classification.create",
          args
        });
        return {
          id: "classification-1",
          ...args.data
        };
      }
    },
    aiRun: {
      create: async (args) => {
        calls.push({
          delegate: "aiRun.create",
          args
        });
        return {
          id: "ai-run-1",
          ...args.data
        };
      },
      findFirst: async (args) => {
        calls.push({
          delegate: "aiRun.findFirst",
          args
        });
        return overrides.draft;
      }
    },
    auditEvent: {
      create: async (args) => {
        calls.push({
          delegate: "auditEvent.create",
          args
        });
        return {
          id: "audit-1",
          ...args.data
        };
      }
    },
    agentFeedback: {
      create: async (args) => {
        calls.push({
          delegate: "agentFeedback.create",
          args
        });
        return {
          id: "feedback-1",
          createdAt: new Date("2026-08-30T10:00:00.000Z"),
          ...args.data
        };
      },
      findMany: async () => []
    }
  };
}

function createIdFactory() {
  let nextId = 1;

  return () => `id-${nextId++}`;
}
