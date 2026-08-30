import { knowledgeSearchRequestSchema } from "@support/contracts";
import { recordRetrievalMetrics, recordValidationErrorMetrics } from "../metrics.js";

function toValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

function toDocumentSummary(document) {
  return {
    id: document.id,
    title: document.title,
    source: document.source,
    sourceUri: document.sourceUri,
    version: document.version,
    language: document.language,
    visibility: document.visibility,
    tags: document.tags,
    chunkCount: document.chunks.length,
    contentHash: document.contentHash
  };
}

function toChunkSummary(chunk) {
  return {
    id: chunk.id,
    documentId: chunk.documentId,
    title: chunk.document.title,
    source: chunk.document.source,
    version: chunk.document.version,
    language: chunk.document.language,
    tags: chunk.document.tags,
    position: chunk.position,
    tokenCount: chunk.tokenCount,
    contentHash: chunk.contentHash,
    content: chunk.content
  };
}

export async function registerKnowledgeRoutes(app, options) {
  const repository = options.knowledgeRepository;
  const retriever = options.knowledgeRetriever;
  const metricsRecorder = options.metricsRecorder;

  app.get("/v1/knowledge/documents", async () => {
    const documents = await repository.listDocuments();

    return {
      data: documents.map(toDocumentSummary)
    };
  });

  app.get("/v1/knowledge/chunks", async (request) => {
    const chunks = await repository.listChunks();
    const query = request.query ?? {};
    const documentId = typeof query.documentId === "string" ? query.documentId : undefined;
    const filteredChunks = documentId
      ? chunks.filter((chunk) => chunk.documentId === documentId)
      : chunks;

    return {
      data: filteredChunks.map(toChunkSummary)
    };
  });

  app.post("/v1/knowledge/search", async (request, reply) => {
    const parsed = knowledgeSearchRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      recordValidationErrorMetrics(metricsRecorder, {
        route: "POST /v1/knowledge/search",
        error: parsed.error
      });

      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid knowledge search request",
          issues: toValidationIssues(parsed.error)
        }
      });
    }

    const result = await retriever.search(parsed.data);
    recordRetrievalMetrics(metricsRecorder, result);

    return {
      data: result.citations,
      meta: {
        query: result.query
      }
    };
  });
}
