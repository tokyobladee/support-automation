import cors from "@fastify/cors";
import Fastify from "fastify";
import { InMemoryAuditLog } from "@support/audit";
import {
  createTicketClassifierProvider,
  CopilotService,
  InMemoryAgentFeedbackRepository,
  InMemoryClassificationRepository,
  InMemoryCopilotRepository,
  TicketClassificationService
} from "@support/ai";
import { createPrismaClient, createPrismaSupportRepositories } from "@support/database";
import { InMemoryMetricsRecorder } from "@support/observability";
import { buildSeededKnowledgeContext } from "@support/retrieval";
import { createAuthContext } from "./auth.js";
import { env } from "./env.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerClassificationRoutes } from "./routes/classifications.js";
import { registerCopilotRoutes } from "./routes/copilot.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerMetricsRoutes } from "./routes/metrics.js";

const healthJsonSchema = {
  type: "object",
  required: ["status", "service"],
  additionalProperties: false,
  properties: {
    status: {
      const: "ok"
    },
    service: {
      const: "support-api"
    }
  }
};

function createAiProvider() {
  return createTicketClassifierProvider({
    providerName: env.AI_PROVIDER,
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_CLASSIFICATION_MODEL
  });
}

function createDefaultClassificationService({ repository }) {
  return new TicketClassificationService({
    provider: createAiProvider(),
    repository
  });
}

function createDefaultCopilotService({ classificationService, knowledgeRetriever, repository }) {
  return new CopilotService({
    classificationService,
    provider: createAiProvider(),
    knowledgeRetriever,
    repository
  });
}

function createMemoryPersistence() {
  return {
    classificationRepository: new InMemoryClassificationRepository(),
    copilotRepository: new InMemoryCopilotRepository(),
    feedbackRepository: new InMemoryAgentFeedbackRepository()
  };
}

async function createPrismaPersistence() {
  const prisma = await createPrismaClient({
    connectionString: env.DATABASE_URL
  });

  return {
    prisma,
    ...createPrismaSupportRepositories({
      prisma,
      organization: {
        name: env.DEFAULT_ORGANIZATION_NAME,
        slug: env.DEFAULT_ORGANIZATION_SLUG
      },
      agent: {
        email: env.DEFAULT_AGENT_EMAIL,
        name: env.DEFAULT_AGENT_NAME,
        role: "agent"
      }
    })
  };
}

async function createPersistence() {
  if (env.PERSISTENCE_PROVIDER === "prisma") {
    return await createPrismaPersistence();
  }

  return createMemoryPersistence();
}

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: true
  });
  const persistence = options.persistence ?? (await createPersistence());
  const authContext =
    options.authContext ??
    createAuthContext({
      mode: env.AUTH_MODE,
      defaultUser: {
        id: env.DEFAULT_AGENT_EMAIL,
        email: env.DEFAULT_AGENT_EMAIL,
        name: env.DEFAULT_AGENT_NAME,
        organizationSlug: env.DEFAULT_ORGANIZATION_SLUG,
        role: env.DEFAULT_AGENT_ROLE
      }
    });
  const auditLog = options.auditLog ?? new InMemoryAuditLog();
  const metricsRecorder = options.metricsRecorder ?? new InMemoryMetricsRecorder();
  const classificationService =
    options.classificationService ??
    createDefaultClassificationService({
      repository: persistence.classificationRepository
    });
  const knowledgeContext =
    options.knowledgeContext ??
    (await buildSeededKnowledgeContext({
      embeddingProviderName: env.EMBEDDING_PROVIDER,
      openAiApiKey: env.OPENAI_API_KEY,
      openAiEmbeddingModel: env.OPENAI_EMBEDDING_MODEL,
      embeddingDimensions: env.OPENAI_EMBEDDING_DIMENSIONS
    }));
  const copilotService =
    options.copilotService ??
    createDefaultCopilotService({
      classificationService,
      knowledgeRetriever: knowledgeContext.retriever,
      repository: persistence.copilotRepository
    });
  const feedbackRepository =
    options.feedbackRepository ?? persistence.feedbackRepository;

  if (persistence.prisma) {
    app.addHook("onClose", async () => {
      await persistence.prisma.$disconnect();
    });
  }

  await app.register(cors, {
    origin: true
  });

  app.get("/health", {
    schema: {
      response: {
        200: healthJsonSchema
      }
    }
  }, async () => ({
    status: "ok",
    service: "support-api"
  }));

  await app.register(registerAuthRoutes, {
    authContext
  });
  await app.register(registerClassificationRoutes, {
    classificationService,
    authContext,
    auditLog,
    metricsRecorder
  });
  await app.register(registerKnowledgeRoutes, {
    knowledgeRepository: knowledgeContext.repository,
    knowledgeRetriever: knowledgeContext.retriever,
    authContext,
    metricsRecorder
  });
  await app.register(registerCopilotRoutes, {
    copilotService,
    feedbackRepository,
    authContext,
    auditLog,
    metricsRecorder
  });
  await app.register(registerAuditRoutes, {
    auditLog,
    authContext
  });
  await app.register(registerMetricsRoutes, {
    metricsRecorder,
    authContext
  });

  return app;
}
