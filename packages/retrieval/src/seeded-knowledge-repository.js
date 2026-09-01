import { InMemoryKnowledgeRepository } from "./in-memory-knowledge-repository.js";
import { KnowledgeDocumentIngestor } from "./knowledge-document-ingestor.js";
import { seedKnowledgeDocuments } from "./seed-knowledge-documents.js";

export async function buildSeededKnowledgeRepository({
  documents = seedKnowledgeDocuments,
  repository = new InMemoryKnowledgeRepository()
} = {}) {
  const ingestor = new KnowledgeDocumentIngestor({ repository });

  for (const document of documents) {
    await ingestor.ingest(document);
  }

  return repository;
}
