import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  createTicketClassifierProvider,
  CopilotService,
  InMemoryAgentFeedbackRepository,
  InMemoryClassificationRepository,
  InMemoryCopilotRepository,
  TicketClassificationService
} from "@support/ai";
import { buildSeededKnowledgeContext } from "@support/retrieval";
import { env } from "./env.js";
import { registerClassificationRoutes } from "./routes/classifications.js";
import { registerCopilotRoutes } from "./routes/copilot.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";

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

function createDefaultClassificationService() {
  return new TicketClassificationService({
    provider: createTicketClassifierProvider({
      providerName: env.AI_PROVIDER,
      openAiApiKey: env.OPENAI_API_KEY,
      openAiModel: env.OPENAI_CLASSIFICATION_MODEL
    }),
    repository: new InMemoryClassificationRepository()
  });
}

function createDefaultCopilotService({ classificationService, knowledgeRetriever }) {
  return new CopilotService({
    classificationService,
    provider: createTicketClassifierProvider({
      providerName: env.AI_PROVIDER,
      openAiApiKey: env.OPENAI_API_KEY,
      openAiModel: env.OPENAI_CLASSIFICATION_MODEL
    }),
    knowledgeRetriever,
    repository: new InMemoryCopilotRepository()
  });
}

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: true
  });
  const classificationService =
    options.classificationService ?? createDefaultClassificationService();
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
      knowledgeRetriever: knowledgeContext.retriever
    });
  const feedbackRepository =
    options.feedbackRepository ?? new InMemoryAgentFeedbackRepository();

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

  await app.register(registerClassificationRoutes, {
    classificationService
  });
  await app.register(registerKnowledgeRoutes, {
    knowledgeRepository: knowledgeContext.repository,
    knowledgeRetriever: knowledgeContext.retriever
  });
  await app.register(registerCopilotRoutes, {
    copilotService,
    feedbackRepository
  });

  return app;
}
