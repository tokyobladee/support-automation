export class InMemoryKnowledgeRepository {
  constructor() {
    this.documents = new Map();
  }

  async saveDocument(document) {
    this.documents.set(document.id, document);
    return document;
  }

  async listDocuments() {
    return [...this.documents.values()];
  }

  async listChunks() {
    return [...this.documents.values()].flatMap((document) =>
      document.chunks.map((chunk) => ({
        ...chunk,
        document
      }))
    );
  }

  async listChunkRecords() {
    return [...this.documents.values()].flatMap((document) => document.chunks);
  }
}
