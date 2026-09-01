import { knowledgeSearchRequestSchema, knowledgeSearchResponseSchema } from "@support/contracts";
import { VectorIndex } from "@support/retrieval";
import { PrismaSupportContext } from "./prisma-support-repositories.js";

export class PrismaKnowledgeRepository {
  constructor({ context }) {
    this.context = context;
  }

  async saveDocument(document) {
    const organization = await this.context.getOrganization();
    const savedDocument = await this.context.prisma.knowledgeDocument.upsert({
      where: {
        organizationId_source_version: {
          organizationId: organization.id,
          source: document.source,
          version: document.version
        }
      },
      update: toDocumentData({ organizationId: organization.id, document }),
      create: {
        id: document.id,
        ...toDocumentData({ organizationId: organization.id, document })
      }
    });

    await this.context.prisma.knowledgeChunk.deleteMany({
      where: {
        documentId: savedDocument.id
      }
    });
    await this.context.prisma.knowledgeChunk.createMany({
      data: document.chunks.map((chunk) => toChunkData({ documentId: savedDocument.id, chunk }))
    });
    await this.refreshSearchText(savedDocument.id);

    return {
      ...toKnowledgeDocument(savedDocument),
      chunks: document.chunks.map((chunk) => ({
        ...chunk,
        documentId: savedDocument.id
      }))
    };
  }

  async listDocuments() {
    const organization = await this.context.getOrganization();
    const documents = await this.context.prisma.knowledgeDocument.findMany({
      where: {
        organizationId: organization.id
      },
      orderBy: {
        title: "asc"
      },
      include: {
        chunks: {
          orderBy: {
            position: "asc"
          }
        }
      }
    });

    return documents.map(toKnowledgeDocumentWithChunks);
  }

  async listChunks() {
    const organization = await this.context.getOrganization();
    const chunks = await this.context.prisma.knowledgeChunk.findMany({
      where: {
        document: {
          organizationId: organization.id
        }
      },
      orderBy: [
        {
          document: {
            title: "asc"
          }
        },
        {
          position: "asc"
        }
      ],
      include: {
        document: true
      }
    });

    return chunks.map(toKnowledgeChunkWithDocument);
  }

  async listChunkRecords() {
    const chunks = await this.listChunks();

    return chunks.map(({ document: _document, ...chunk }) => chunk);
  }

  async refreshSearchText(documentId) {
    await this.context.prisma.$executeRawUnsafe(
      `UPDATE knowledge_chunks
       SET "searchText" = to_tsvector('simple', content)
       WHERE "documentId" = $1`,
      documentId
    );
  }
}

export class PrismaKeywordKnowledgeRetriever {
  constructor({ context }) {
    this.context = context;
  }

  async search(input) {
    const request = knowledgeSearchRequestSchema.parse(input);
    const organization = await this.context.getOrganization();
    const rows = await this.context.prisma.$queryRawUnsafe(
      buildKeywordSearchSql(request),
      ...buildKeywordSearchParams({ request, organizationId: organization.id })
    );

    return knowledgeSearchResponseSchema.parse({
      query: request.query,
      citations: rows.map(toCitation)
    });
  }
}

export class PrismaPgVectorIndex extends VectorIndex {
  constructor({ context, dimensions = 1536 }) {
    super();
    this.context = context;
    this.dimensions = dimensions;
  }

  async upsertChunks(chunks) {
    for (const chunk of chunks) {
      assertEmbeddingDimensions({
        embedding: chunk.embedding,
        dimensions: this.dimensions,
        chunkId: chunk.id
      });
    await this.context.prisma.$executeRawUnsafe(
      `UPDATE knowledge_chunks
       SET embedding = $1::vector,
           "searchText" = to_tsvector('simple', content)
       WHERE id = $2`,
        toVectorLiteral(chunk.embedding),
        chunk.id
      );
    }
  }

  async search(input) {
    const organization = await this.context.getOrganization();
    const embedding = input.embedding ?? [];

    assertEmbeddingDimensions({
      embedding,
      dimensions: this.dimensions,
      chunkId: "query"
    });

    const rows = await this.context.prisma.$queryRawUnsafe(
      buildVectorSearchSql(input),
      ...buildVectorSearchParams({
        input,
        organizationId: organization.id,
        embedding
      })
    );

    return rows.map((row) => ({
      chunk: toKnowledgeChunkWithDocument(row),
      score: Number(row.score)
    }));
  }
}

export function createPrismaKnowledgeStores({
  prisma,
  organization,
  idFactory,
  embeddingDimensions
}) {
  const context = new PrismaSupportContext({
    prisma,
    organization,
    idFactory
  });
  const repository = new PrismaKnowledgeRepository({
    context
  });
  const vectorIndex = new PrismaPgVectorIndex({
    context,
    dimensions: embeddingDimensions
  });
  const keywordRetriever = new PrismaKeywordKnowledgeRetriever({
    context
  });

  return {
    knowledgeRepository: repository,
    keywordRetriever,
    vectorIndex
  };
}

function buildKeywordSearchSql(request) {
  const filters = buildFilterClauses(request, 3);

  return `SELECT
      c.id,
      c."documentId" AS "documentId",
      c.position,
      c.content,
      c."contentHash" AS "contentHash",
      c."tokenCount" AS "tokenCount",
      c.metadata,
      d.id AS "document.id",
      d.title AS "document.title",
      d.source AS "document.source",
      d."sourceUri" AS "document.sourceUri",
      d.version AS "document.version",
      d.language AS "document.language",
      d.visibility AS "document.visibility",
      d.tags AS "document.tags",
      d."contentHash" AS "document.contentHash",
      d."validFrom" AS "document.validFrom",
      d."validUntil" AS "document.validUntil",
      LEAST(1, ts_rank_cd(
        setweight(to_tsvector('simple', d.title), 'A') ||
        setweight(to_tsvector('simple', array_to_string(d.tags, ' ')), 'B') ||
        setweight(coalesce(c."searchText", to_tsvector('simple', c.content)), 'C'),
        websearch_to_tsquery('simple', $1)
      ) * 8) AS score
    FROM knowledge_chunks c
    INNER JOIN knowledge_documents d ON d.id = c."documentId"
    WHERE d."organizationId" = $2
      AND (
        setweight(to_tsvector('simple', d.title), 'A') ||
        setweight(to_tsvector('simple', array_to_string(d.tags, ' ')), 'B') ||
        setweight(coalesce(c."searchText", to_tsvector('simple', c.content)), 'C')
      ) @@ websearch_to_tsquery('simple', $1)
      ${filters.sql}
    ORDER BY score DESC, c.position ASC
    LIMIT $${filters.nextIndex}`;
}

function buildVectorSearchSql(input) {
  const filters = buildFilterClauses(input, 3);

  return `SELECT
      c.id,
      c."documentId" AS "documentId",
      c.position,
      c.content,
      c."contentHash" AS "contentHash",
      c."tokenCount" AS "tokenCount",
      c.metadata,
      d.id AS "document.id",
      d.title AS "document.title",
      d.source AS "document.source",
      d."sourceUri" AS "document.sourceUri",
      d.version AS "document.version",
      d.language AS "document.language",
      d.visibility AS "document.visibility",
      d.tags AS "document.tags",
      d."contentHash" AS "document.contentHash",
      d."validFrom" AS "document.validFrom",
      d."validUntil" AS "document.validUntil",
      GREATEST(0, 1 - (c.embedding <=> $1::vector)) AS score
    FROM knowledge_chunks c
    INNER JOIN knowledge_documents d ON d.id = c."documentId"
    WHERE c.embedding IS NOT NULL
      AND d."organizationId" = $2
      ${filters.sql}
    ORDER BY c.embedding <=> $1::vector ASC
    LIMIT $${filters.nextIndex}`;
}

function buildKeywordSearchParams({ request, organizationId }) {
  return buildSearchParams({
    baseParams: [request.query, organizationId],
    filters: request,
    topK: request.topK
  });
}

function buildVectorSearchParams({ input, organizationId, embedding }) {
  return buildSearchParams({
    baseParams: [toVectorLiteral(embedding), organizationId],
    filters: input,
    topK: input.topK ?? 5
  });
}

function buildSearchParams({ baseParams, filters, topK }) {
  const params = [...baseParams];

  if (filters.language) {
    params.push(filters.language);
  }

  if (filters.tags?.length > 0) {
    params.push(filters.tags);
  }

  params.push(topK);

  return params;
}

function buildFilterClauses(filters, startIndex) {
  const clauses = [];
  let nextIndex = startIndex;

  if (filters.language) {
    clauses.push(`AND d.language = $${nextIndex}`);
    nextIndex += 1;
  }

  if (filters.tags?.length > 0) {
    clauses.push(`AND d.tags @> $${nextIndex}::text[]`);
    nextIndex += 1;
  }

  return {
    sql: clauses.join("\n      "),
    nextIndex
  };
}

function toDocumentData({ organizationId, document }) {
  return {
    organizationId,
    title: document.title,
    source: document.source,
    sourceUri: document.sourceUri,
    version: document.version,
    language: document.language,
    visibility: document.visibility,
    tags: document.tags,
    contentHash: document.contentHash,
    validFrom: document.validFrom ? new Date(document.validFrom) : undefined,
    validUntil: document.validUntil ? new Date(document.validUntil) : undefined
  };
}

function toChunkData({ documentId, chunk }) {
  return {
    id: chunk.id,
    documentId,
    position: chunk.position,
    content: chunk.content,
    contentHash: chunk.contentHash,
    tokenCount: chunk.tokenCount,
    metadata: chunk.metadata
  };
}

function toKnowledgeDocumentWithChunks(record) {
  return {
    ...toKnowledgeDocument(record),
    chunks: record.chunks.map(toKnowledgeChunk)
  };
}

function toKnowledgeChunkWithDocument(row) {
  return {
    ...toKnowledgeChunk(row),
    document: toKnowledgeDocument(readDocumentRecord(row))
  };
}

function toKnowledgeDocument(record) {
  return {
    id: record.id,
    title: record.title,
    source: record.source,
    sourceUri: record.sourceUri ?? undefined,
    version: record.version,
    language: record.language,
    visibility: record.visibility,
    tags: record.tags,
    contentHash: record.contentHash,
    validFrom: record.validFrom?.toISOString(),
    validUntil: record.validUntil?.toISOString(),
    chunks: []
  };
}

function toKnowledgeChunk(record) {
  return {
    id: record.id,
    documentId: record.documentId,
    position: record.position,
    content: record.content,
    contentHash: record.contentHash,
    tokenCount: record.tokenCount,
    metadata: record.metadata ?? {}
  };
}

function toCitation(row) {
  const chunk = toKnowledgeChunkWithDocument(row);

  return {
    documentId: chunk.document.id,
    chunkId: chunk.id,
    title: chunk.document.title,
    source: chunk.document.source,
    sourceUri: chunk.document.sourceUri,
    version: chunk.document.version,
    language: chunk.document.language,
    position: chunk.position,
    quote: chunk.content,
    relevanceScore: Number(row.score),
    tags: chunk.document.tags
  };
}

function readDocumentRecord(row) {
  return row.document
    ? row.document
    : {
        id: row["document.id"],
        title: row["document.title"],
        source: row["document.source"],
        sourceUri: row["document.sourceUri"],
        version: row["document.version"],
        language: row["document.language"],
        visibility: row["document.visibility"],
        tags: row["document.tags"],
        contentHash: row["document.contentHash"],
        validFrom: row["document.validFrom"],
        validUntil: row["document.validUntil"]
      };
}

function toVectorLiteral(embedding) {
  return `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function assertEmbeddingDimensions({ embedding, dimensions, chunkId }) {
  if (!Array.isArray(embedding) || embedding.length !== dimensions) {
    throw new Error(
      `Expected ${dimensions} embedding dimensions for ${chunkId}, received ${embedding?.length ?? 0}`
    );
  }
}
