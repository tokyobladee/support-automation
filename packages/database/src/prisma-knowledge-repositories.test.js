import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PrismaKnowledgeRepository,
  PrismaKeywordKnowledgeRetriever,
  PrismaPgVectorIndex
} from "./prisma-knowledge-repositories.js";
import { PrismaSupportContext } from "./prisma-support-repositories.js";

const sampleDocument = Object.freeze({
  id: "doc-1",
  title: "Refund Policy",
  source: "policy",
  sourceUri: "https://internal.example.com/policies/refunds",
  version: "2026-08",
  language: "en",
  visibility: "agent_only",
  tags: ["refunds", "billing"],
  contentHash: "a".repeat(64),
  chunks: [
    {
      id: "chunk-1",
      documentId: "doc-1",
      position: 0,
      content: "Refund requests require human review.",
      contentHash: "b".repeat(64),
      tokenCount: 5,
      metadata: {
        section: "money movement"
      }
    }
  ]
});

describe("PrismaKnowledgeRepository", () => {
  it("persists documents and chunks through Prisma delegates", async () => {
    const calls = [];
    const context = new PrismaSupportContext({
      prisma: createFakePrisma(calls),
      idFactory: createIdFactory()
    });
    const repository = new PrismaKnowledgeRepository({ context });

    const savedDocument = await repository.saveDocument(sampleDocument);

    assert.deepEqual(
      calls.map((call) => call.delegate),
      [
        "organization.upsert",
        "knowledgeDocument.upsert",
        "knowledgeChunk.deleteMany",
        "knowledgeChunk.createMany",
        "$executeRawUnsafe"
      ]
    );
    assert.equal(savedDocument.id, "doc-1");
    assert.equal(savedDocument.chunks[0].id, "chunk-1");
    assert.equal(calls[3].args.data[0].metadata.section, "money movement");
    assert.match(calls[4].args[0], /to_tsvector\('simple', content\)/u);
  });

  it("lists chunks with document metadata for citation assembly", async () => {
    const context = new PrismaSupportContext({
      prisma: createFakePrisma([], {
        chunks: [createChunkRecord()]
      }),
      idFactory: createIdFactory()
    });
    const repository = new PrismaKnowledgeRepository({ context });

    const chunks = await repository.listChunks();

    assert.equal(chunks[0].document.title, "Refund Policy");
    assert.equal(chunks[0].document.tags[0], "refunds");
  });
});

describe("PrismaKeywordKnowledgeRetriever", () => {
  it("returns citations from PostgreSQL full-text rows", async () => {
    const calls = [];
    const context = new PrismaSupportContext({
      prisma: createFakePrisma(calls, {
        rawRows: [
          {
            ...createChunkRecord(),
            score: 0.74
          }
        ]
      }),
      idFactory: createIdFactory()
    });
    const retriever = new PrismaKeywordKnowledgeRetriever({ context });

    const result = await retriever.search({
      query: "refund chargeback",
      topK: 3,
      language: "en",
      tags: ["refunds"]
    });

    assert.equal(result.query, "refund chargeback");
    assert.equal(result.citations[0].title, "Refund Policy");
    assert.equal(result.citations[0].relevanceScore, 0.74);
    assert.match(calls.at(-1).args[0], /websearch_to_tsquery/u);
    assert.deepEqual(calls.at(-1).args.slice(1), ["refund chargeback", "org-1", "en", ["refunds"], 3]);
  });
});

describe("PrismaPgVectorIndex", () => {
  it("updates chunk embeddings through pgvector SQL", async () => {
    const calls = [];
    const context = new PrismaSupportContext({
      prisma: createFakePrisma(calls),
      idFactory: createIdFactory()
    });
    const vectorIndex = new PrismaPgVectorIndex({
      context,
      dimensions: 2
    });

    await vectorIndex.upsertChunks([
      {
        ...sampleDocument.chunks[0],
        document: sampleDocument,
        embedding: [0.1, 0.2]
      }
    ]);

    assert.equal(calls.at(-1).delegate, "$executeRawUnsafe");
    assert.match(calls.at(-1).args[0], /embedding = \$1::vector/u);
    assert.equal(calls.at(-1).args[1], "[0.10000000,0.20000000]");
    assert.equal(calls.at(-1).args[2], "chunk-1");
  });

  it("rejects embeddings that do not match the configured pgvector dimensions", async () => {
    const vectorIndex = new PrismaPgVectorIndex({
      context: new PrismaSupportContext({
        prisma: createFakePrisma([]),
        idFactory: createIdFactory()
      }),
      dimensions: 3
    });

    await assert.rejects(
      () =>
        vectorIndex.upsertChunks([
          {
            ...sampleDocument.chunks[0],
            document: sampleDocument,
            embedding: [0.1, 0.2]
          }
        ]),
      /Expected 3 embedding dimensions/u
    );
  });
});

function createFakePrisma(calls, overrides = {}) {
  const organization = {
    id: "org-1",
    slug: "default-support",
    name: "Default Support Organization"
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
    knowledgeDocument: {
      upsert: async (args) => {
        calls.push({
          delegate: "knowledgeDocument.upsert",
          args
        });
        return {
          id: sampleDocument.id,
          ...args.create
        };
      },
      findMany: async (args) => {
        calls.push({
          delegate: "knowledgeDocument.findMany",
          args
        });
        return overrides.documents ?? [
          {
            ...sampleDocument,
            chunks: sampleDocument.chunks
          }
        ];
      }
    },
    knowledgeChunk: {
      deleteMany: async (args) => {
        calls.push({
          delegate: "knowledgeChunk.deleteMany",
          args
        });
      },
      createMany: async (args) => {
        calls.push({
          delegate: "knowledgeChunk.createMany",
          args
        });
      },
      findMany: async (args) => {
        calls.push({
          delegate: "knowledgeChunk.findMany",
          args
        });
        return overrides.chunks ?? [];
      }
    },
    $executeRawUnsafe: async (...args) => {
      calls.push({
        delegate: "$executeRawUnsafe",
        args
      });
    },
    $queryRawUnsafe: async (...args) => {
      calls.push({
        delegate: "$queryRawUnsafe",
        args
      });
      return overrides.rawRows ?? [];
    }
  };
}

function createChunkRecord() {
  return {
    id: "chunk-1",
    documentId: "doc-1",
    position: 0,
    content: "Refund requests require human review.",
    contentHash: "b".repeat(64),
    tokenCount: 5,
    metadata: {
      section: "money movement"
    },
    document: sampleDocument
  };
}

function createIdFactory() {
  let nextId = 1;

  return () => `id-${nextId++}`;
}
