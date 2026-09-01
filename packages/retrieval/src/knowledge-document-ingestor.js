import { knowledgeDocumentInputSchema, knowledgeDocumentSchema } from "@support/contracts";
import { ChunkingPolicy } from "./chunking-policy.js";
import { createContentHash } from "./content-hash.js";

export class KnowledgeDocumentIngestor {
  constructor({ repository, chunkingPolicy = new ChunkingPolicy() }) {
    this.repository = repository;
    this.chunkingPolicy = chunkingPolicy;
  }

  async ingest(input) {
    const documentInput = knowledgeDocumentInputSchema.parse(input);
    const id = createDocumentId(documentInput);
    const contentHash = createContentHash(documentInput.content);
    const chunks = this.chunkingPolicy.split({
      documentId: id,
      content: documentInput.content
    });
    const document = knowledgeDocumentSchema.parse({
      ...documentInput,
      id,
      contentHash,
      chunks
    });

    return this.repository.saveDocument(document);
  }
}

function createDocumentId(document) {
  return createContentHash(`${document.source}:${document.version}:${document.title}`).slice(0, 24);
}
