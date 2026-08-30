import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  createTicketClassifierProvider,
  InMemoryClassificationRepository,
  TicketClassificationService
} from "@support/ai";
import { env } from "./env.js";
import { registerClassificationRoutes } from "./routes/classifications.js";

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

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: true
  });
  const classificationService =
    options.classificationService ?? createDefaultClassificationService();

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

  return app;
}
