export class KnowledgeRetriever {
  async search(_query) {
    throw new Error("KnowledgeRetriever.search must be implemented");
  }
}

export class EmbeddingProvider {
  async embedText(_input) {
    throw new Error("EmbeddingProvider.embedText must be implemented");
  }
}

export class VectorIndex {
  async upsertChunks(_chunks) {
    throw new Error("VectorIndex.upsertChunks must be implemented");
  }

  async search(_query) {
    throw new Error("VectorIndex.search must be implemented");
  }
}
