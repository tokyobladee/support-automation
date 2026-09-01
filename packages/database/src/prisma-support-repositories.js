import { randomUUID } from "node:crypto";

const defaultOrganization = Object.freeze({
  name: "Default Support Organization",
  slug: "default-support"
});

const defaultAgent = Object.freeze({
  email: "agent@example.com",
  name: "Support Agent",
  role: "agent"
});

export class FeedbackDraftNotFoundError extends Error {
  constructor(draftId) {
    super(`Copilot draft was not found: ${draftId}`);
    this.name = "FeedbackDraftNotFoundError";
    this.draftId = draftId;
  }
}

export class PrismaSupportContext {
  constructor({
    prisma,
    organization = defaultOrganization,
    agent = defaultAgent,
    idFactory = randomUUID
  }) {
    this.prisma = prisma;
    this.organization = organization;
    this.agent = agent;
    this.idFactory = idFactory;
  }

  async getOrganization() {
    return this.prisma.organization.upsert({
      where: {
        slug: this.organization.slug
      },
      update: {
        name: this.organization.name
      },
      create: {
        id: this.idFactory(),
        name: this.organization.name,
        slug: this.organization.slug
      }
    });
  }

  async getAgent() {
    const organization = await this.getOrganization();

    return this.prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: this.agent.email
        }
      },
      update: {
        name: this.agent.name,
        role: this.agent.role
      },
      create: {
        id: this.idFactory(),
        organizationId: organization.id,
        email: this.agent.email,
        name: this.agent.name,
        role: this.agent.role
      }
    });
  }

  async createTicket(request, status = "triaged") {
    const organization = await this.getOrganization();
    const data = {
      organizationId: organization.id,
      source: request.source,
      status,
      externalId: request.externalId,
      customerId: request.customerId,
      subject: request.subject,
      text: request.text
    };

    if (!request.externalId) {
      return this.prisma.ticket.create({
        data: {
          id: this.idFactory(),
          ...data
        }
      });
    }

    return this.prisma.ticket.upsert({
      where: {
        organizationId_source_externalId: {
          organizationId: organization.id,
          source: request.source,
          externalId: request.externalId
        }
      },
      update: data,
      create: {
        id: this.idFactory(),
        ...data
      }
    });
  }

  async createAuditEvent({ organizationId, ticketId, userId, aiRunId, type, actorType, payload }) {
    return this.prisma.auditEvent.create({
      data: {
        id: this.idFactory(),
        organizationId,
        ticketId,
        userId,
        aiRunId,
        type,
        actorType,
        payload
      }
    });
  }
}

export class PrismaClassificationRepository {
  constructor({ context }) {
    this.context = context;
  }

  async saveClassification(record) {
    const ticket = await this.context.createTicket(record.request);
    const classification = await this.context.prisma.classification.create({
      data: {
        id: this.context.idFactory(),
        ticketId: ticket.id,
        category: record.classification.category,
        priority: record.classification.priority,
        automationEligibility: record.classification.automationEligibility,
        confidence: record.classification.confidence,
        recommendedNextStep: record.classification.recommendedNextStep,
        rationale: record.classification.rationale,
        reviewReasons: record.classification.reviewReasons,
        evidence: record.classification.evidence
      }
    });
    const aiRun = await this.context.prisma.aiRun.create({
      data: {
        id: this.context.idFactory(),
        ticketId: ticket.id,
        classificationId: classification.id,
        provider: record.aiRun.provider,
        model: record.aiRun.model,
        purpose: "ticket_classification",
        status: "succeeded",
        inputMetadata: toAiRunMetadata(record),
        output: record.classification
      }
    });

    await this.context.createAuditEvent({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      aiRunId: aiRun.id,
      type: "ticket_classified",
      actorType: "ai",
      payload: {
        category: record.classification.category,
        priority: record.classification.priority,
        automationEligibility: record.classification.automationEligibility,
        reviewReasons: record.classification.reviewReasons
      }
    });

    return {
      ticket,
      classification,
      aiRun
    };
  }
}

export class PrismaCopilotRepository {
  constructor({ context }) {
    this.context = context;
  }

  async saveCopilotDraft(record) {
    const ticket = await this.context.createTicket(record.request, "in_review");
    const aiRun = await this.context.prisma.aiRun.create({
      data: {
        id: this.context.idFactory(),
        ticketId: ticket.id,
        provider: record.aiRun.provider,
        model: record.aiRun.model,
        purpose: "reply_generation",
        status: "succeeded",
        inputMetadata: {
          ...toAiRunMetadata(record),
          draftId: record.id,
          citationChunkIds: record.result.citations.map((citation) => citation.chunkId)
        },
        output: record.result
      }
    });
    const replyVariants = await Promise.all(
      record.result.replyVariants.map((variant) =>
        this.context.prisma.replyVariant.create({
          data: {
            id: this.context.idFactory(),
            ticketId: ticket.id,
            aiRunId: aiRun.id,
            tone: variant.tone,
            content: `${variant.subject}\n\n${variant.body}`,
            citations: record.result.citations.filter((citation) =>
              variant.citationChunkIds.includes(citation.chunkId)
            ),
            requiresReview: record.result.automationEligibility !== "safe_to_suggest"
          }
        })
      )
    );

    await this.context.createAuditEvent({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      aiRunId: aiRun.id,
      type: "copilot_draft_created",
      actorType: "ai",
      payload: {
        draftId: record.id,
        tones: record.result.replyVariants.map((variant) => variant.tone),
        automationEligibility: record.result.automationEligibility,
        reviewReasons: record.result.reviewReasons
      }
    });

    return {
      ticket,
      aiRun,
      replyVariants
    };
  }
}

export class PrismaAgentFeedbackRepository {
  constructor({ context }) {
    this.context = context;
  }

  async saveFeedback(input) {
    const agent = await this.context.getAgent();
    const draft = await this.findDraft(input.draftId);

    if (!draft?.ticketId) {
      throw new FeedbackDraftNotFoundError(input.draftId);
    }

    const replyVariant = input.tone
      ? draft.replyVariants.find((variant) => variant.tone === input.tone)
      : undefined;
    const feedback = await this.context.prisma.agentFeedback.create({
      data: {
        id: this.context.idFactory(),
        ticketId: draft.ticketId,
        userId: agent.id,
        replyVariantId: replyVariant?.id,
        decision: input.decision,
        editedContent: input.editedContent,
        reason: input.reason
      }
    });

    await this.context.createAuditEvent({
      organizationId: agent.organizationId,
      ticketId: draft.ticketId,
      userId: agent.id,
      aiRunId: draft.id,
      type: "agent_feedback_recorded",
      actorType: "user",
      payload: {
        draftId: input.draftId,
        decision: input.decision,
        tone: input.tone,
        hasEditedContent: Boolean(input.editedContent),
        reason: input.reason
      }
    });

    return toAgentFeedbackDto({
      ...feedback,
      draftId: input.draftId,
      tone: input.tone
    });
  }

  async listFeedback() {
    const records = await this.context.prisma.agentFeedback.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        replyVariant: {
          include: {
            aiRun: true
          }
        }
      }
    });

    return records.map((record) =>
      toAgentFeedbackDto({
        ...record,
        draftId: readDraftId(record.replyVariant?.aiRun?.inputMetadata),
        tone: record.replyVariant?.tone
      })
    );
  }

  async findDraft(draftId) {
    return this.context.prisma.aiRun.findFirst({
      where: {
        purpose: "reply_generation",
        inputMetadata: {
          path: ["draftId"],
          equals: draftId
        }
      },
      include: {
        replyVariants: true
      }
    });
  }
}

export function createPrismaSupportRepositories({
  prisma,
  organization,
  agent,
  idFactory
}) {
  const context = new PrismaSupportContext({
    prisma,
    organization,
    agent,
    idFactory
  });

  return {
    classificationRepository: new PrismaClassificationRepository({ context }),
    copilotRepository: new PrismaCopilotRepository({ context }),
    feedbackRepository: new PrismaAgentFeedbackRepository({ context })
  };
}

function toAiRunMetadata(record) {
  return {
    promptVersion: record.aiRun.promptVersion,
    prompt: record.aiRun.prompt,
    startedAt: record.aiRun.startedAt.toISOString(),
    finishedAt: record.aiRun.finishedAt.toISOString(),
    source: record.request.source,
    externalId: record.request.externalId,
    customerId: record.request.customerId,
    subject: record.request.subject,
    textLength: record.request.text.length
  };
}

function toAgentFeedbackDto(record) {
  return {
    id: record.id,
    draftId: record.draftId ?? "unknown",
    decision: record.decision,
    tone: record.tone,
    editedContent: record.editedContent ?? undefined,
    reason: record.reason ?? undefined,
    createdAt: record.createdAt.toISOString()
  };
}

function readDraftId(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata.draftId;
}
