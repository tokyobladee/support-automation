export class KnowledgeEmbeddingIngestor {
  constructor({ embeddingProvider, vectorIndex }) {
    this.embeddingProvider = embeddingProvider;
    this.vectorIndex = vectorIndex;
  }

  async indexDocument(document) {
    const chunks = [];

    for (const chunk of document.chunks) {
      const embedding = await this.embeddingProvider.embedText({
        text: chunk.content
      });

      chunks.push({
        ...chunk,
        document,
        embedding
      });
    }

    await this.vectorIndex.upsertChunks(chunks);

    return chunks;
  }
}
