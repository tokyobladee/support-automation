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
import {
  createPrismaClient,
  createPrismaKnowledgeStores,
  createPrismaSupportRepositories
} from "@support/database";
import {
  createNoopTraceRecorder,
  InMemoryMetricsRecorder,
  instrumentMethods,
  OpenTelemetryTraceRecorder
} from "@support/observability";
import {
  buildSeededKnowledgeContext,
  createEmbeddingProvider,
  HybridKnowledgeRetriever,
  KnowledgeDocumentIngestor,
  KnowledgeEmbeddingIngestor,
  seedKnowledgeDocuments
} from "@support/retrieval";
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

function createAiProvider({ traceRecorder }) {
  const provider = createTicketClassifierProvider({
    providerName: env.AI_PROVIDER,
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_CLASSIFICATION_MODEL
  });

  return instrumentMethods({
    target: provider,
    traceRecorder,
    spans: {
      classifyTicket: {
        name: "ai.classify_ticket",
        options: ([input]) => ({
          attributes: {
            "ai.provider": provider.name,
            "ai.model": provider.model,
            "ai.prompt_version": input.prompt.version,
            "ai.attempt": input.attempt,
            "ticket.source": input.request.source,
            "ticket.has_subject": Boolean(input.request.subject)
          }
        })
      },
      generateReplyVariants: {
        name: "ai.generate_reply_variants",
        options: ([input]) => ({
          attributes: {
            "ai.provider": provider.name,
            "ai.model": provider.model,
            "ai.prompt_version": input.prompt.version,
            "ticket.source": input.request.source,
            "classification.category": input.classification.category,
            "classification.priority": input.classification.priority,
            "retrieval.citation_count": input.citations.length
          }
        })
      }
    }
  });
}

function createDefaultClassificationService({ repository, traceRecorder }) {
  return new TicketClassificationService({
    provider: createAiProvider({ traceRecorder }),
    repository
  });
}

function createDefaultCopilotService({
  classificationService,
  knowledgeRetriever,
  repository,
  traceRecorder
}) {
  return new CopilotService({
    classificationService,
    provider: createAiProvider({ traceRecorder }),
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

function instrumentPersistence({ persistence, traceRecorder }) {
  return {
    ...persistence,
    classificationRepository: instrumentMethods({
      target: persistence.classificationRepository,
      traceRecorder,
      spans: {
        saveClassification: {
          name: "persistence.save_classification",
          options: ([record]) => ({
            attributes: {
              "ticket.source": record.request.source,
              "classification.category": record.classification.category,
              "classification.priority": record.classification.priority,
              "ai.provider": record.aiRun.provider
            }
          })
        }
      }
    }),
    copilotRepository: instrumentMethods({
      target: persistence.copilotRepository,
      traceRecorder,
      spans: {
        saveCopilotDraft: {
          name: "persistence.save_copilot_draft",
          options: ([record]) => ({
            attributes: {
              "ticket.source": record.request.source,
              "ai.provider": record.aiRun.provider,
              "reply.variant_count": record.result.replyVariants.length,
              "retrieval.citation_count": record.result.citations.length
            }
          })
        }
      }
    }),
    feedbackRepository: instrumentMethods({
      target: persistence.feedbackRepository,
      traceRecorder,
      spans: {
        saveFeedback: {
          name: "persistence.save_agent_feedback",
          options: ([input]) => ({
            attributes: {
              "feedback.decision": input.decision,
              "feedback.has_tone": Boolean(input.tone),
              "feedback.has_edit": Boolean(input.editedContent)
            }
          })
        },
        listFeedback: {
          name: "persistence.list_agent_feedback",
          options: () => ({
            attributes: {}
          })
        }
      }
    })
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

async function createKnowledgeContext({ persistence, traceRecorder }) {
  const embeddingDimensions =
    env.OPENAI_EMBEDDING_DIMENSIONS ?? (persistence.prisma ? 1536 : undefined);

  if (!persistence.prisma) {
    const embeddingProvider = createEmbeddingProvider({
      providerName: env.EMBEDDING_PROVIDER,
      openAiApiKey: env.OPENAI_API_KEY,
      openAiModel: env.OPENAI_EMBEDDING_MODEL,
      dimensions: embeddingDimensions
    });
    const context = await buildSeededKnowledgeContext({
      embeddingProviderName: env.EMBEDDING_PROVIDER,
      openAiApiKey: env.OPENAI_API_KEY,
      openAiEmbeddingModel: env.OPENAI_EMBEDDING_MODEL,
      embeddingDimensions,
      embeddingProvider: instrumentEmbeddingProvider({
        embeddingProvider,
        traceRecorder
      })
    });

    return {
      repository: instrumentKnowledgeRepository({
        knowledgeRepository: context.repository,
        traceRecorder
      }),
      retriever: instrumentKnowledgeRetriever({
        knowledgeRetriever: context.retriever,
        traceRecorder
      })
    };
  }

  const embeddingProvider = createEmbeddingProvider({
    providerName: env.EMBEDDING_PROVIDER,
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_EMBEDDING_MODEL,
    dimensions: embeddingDimensions
  });
  const { knowledgeRepository, keywordRetriever, vectorIndex } = createPrismaKnowledgeStores({
    prisma: persistence.prisma,
    organization: {
      name: env.DEFAULT_ORGANIZATION_NAME,
      slug: env.DEFAULT_ORGANIZATION_SLUG
    },
    embeddingDimensions
  });
  const tracedKnowledgeRepository = instrumentKnowledgeRepository({
    knowledgeRepository,
    traceRecorder
  });
  const tracedEmbeddingProvider = instrumentEmbeddingProvider({
    embeddingProvider,
    traceRecorder
  });
  const tracedVectorIndex = instrumentVectorIndex({
    vectorIndex,
    traceRecorder
  });
  const documentIngestor = new KnowledgeDocumentIngestor({
    repository: tracedKnowledgeRepository
  });
  const embeddingIngestor = new KnowledgeEmbeddingIngestor({
    embeddingProvider: tracedEmbeddingProvider,
    vectorIndex: tracedVectorIndex
  });

  for (const documentInput of seedKnowledgeDocuments) {
    const document = await documentIngestor.ingest(documentInput);
    await embeddingIngestor.indexDocument(document);
  }

  return {
    repository: tracedKnowledgeRepository,
    retriever: instrumentKnowledgeRetriever({
      knowledgeRetriever: new HybridKnowledgeRetriever({
        keywordRetriever,
        embeddingProvider: tracedEmbeddingProvider,
        vectorIndex: tracedVectorIndex
      }),
      traceRecorder
    })
  };
}

function instrumentKnowledgeRepository({ knowledgeRepository, traceRecorder }) {
  return instrumentMethods({
    target: knowledgeRepository,
    traceRecorder,
    spans: {
      saveDocument: {
        name: "persistence.save_knowledge_document",
        options: ([document]) => ({
          attributes: {
            "knowledge.source": document.source,
            "knowledge.version": document.version,
            "knowledge.chunk_count": document.chunks.length
          }
        })
      },
      listDocuments: {
        name: "persistence.list_knowledge_documents",
        options: () => ({
          attributes: {}
        })
      },
      listChunks: {
        name: "persistence.list_knowledge_chunks",
        options: () => ({
          attributes: {}
        })
      }
    }
  });
}

function instrumentVectorIndex({ vectorIndex, traceRecorder }) {
  return instrumentMethods({
    target: vectorIndex,
    traceRecorder,
    spans: {
      upsertChunks: {
        name: "persistence.upsert_vector_chunks",
        options: ([chunks]) => ({
          attributes: {
            "knowledge.chunk_count": chunks.length
          }
        })
      },
      search: {
        name: "retrieval.vector_search",
        options: ([input]) => ({
          attributes: {
            "retrieval.top_k": input.topK ?? 5,
            "embedding.dimension_count": input.embedding?.length ?? 0
          }
        })
      }
    }
  });
}

function instrumentEmbeddingProvider({ embeddingProvider, traceRecorder }) {
  return instrumentMethods({
    target: embeddingProvider,
    traceRecorder,
    spans: {
      embedText: {
        name: "retrieval.embed_text",
        options: ([input]) => ({
          attributes: {
            "embedding.provider": embeddingProvider.name ?? env.EMBEDDING_PROVIDER,
            "embedding.model": embeddingProvider.model ?? env.OPENAI_EMBEDDING_MODEL,
            "input.length": input.text.length
          }
        })
      }
    }
  });
}

function instrumentKnowledgeRetriever({ knowledgeRetriever, traceRecorder }) {
  return instrumentMethods({
    target: knowledgeRetriever,
    traceRecorder,
    spans: {
      search: {
        name: "retrieval.search",
        options: ([input]) => ({
          attributes: {
            "retrieval.top_k": input.topK ?? 5,
            "retrieval.has_language_filter": Boolean(input.language),
            "retrieval.tag_count": input.tags?.length ?? 0,
            "query.length": input.query.length
          }
        })
      }
    }
  });
}

async function registerRequestTracing(app, traceRecorder) {
  app.addHook("onRequest", async (request) => {
    request.traceSpan = traceRecorder.startSpan("api.request", {
      attributes: {
        "http.request.method": request.method,
        "url.path": request.url.split("?")[0]
      }
    });
  });

  app.addHook("onResponse", async (request, reply) => {
    request.traceSpan?.setAttribute("http.response.status_code", reply.statusCode);
    request.traceSpan?.end();
  });

  app.addHook("onError", async (request, _reply, error) => {
    request.traceSpan?.end(error);
    request.traceSpan = undefined;
  });
}

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: true
  });
  const traceRecorder =
    options.traceRecorder ??
    (env.TRACING_PROVIDER === "opentelemetry"
      ? new OpenTelemetryTraceRecorder()
      : createNoopTraceRecorder());
  const rawPersistence = options.persistence ?? (await createPersistence());
  const persistence = instrumentPersistence({
    persistence: rawPersistence,
    traceRecorder
  });
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
      repository: persistence.classificationRepository,
      traceRecorder
    });
  const knowledgeContext =
    options.knowledgeContext ??
    (await createKnowledgeContext({
      persistence,
      traceRecorder
    }));
  const copilotService =
    options.copilotService ??
    createDefaultCopilotService({
      classificationService,
      knowledgeRetriever: knowledgeContext.retriever,
      repository: persistence.copilotRepository,
      traceRecorder
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

  await registerRequestTracing(app, traceRecorder);

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
