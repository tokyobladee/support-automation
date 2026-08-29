import cors from "@fastify/cors";
import Fastify from "fastify";

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

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

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

  return app;
}
