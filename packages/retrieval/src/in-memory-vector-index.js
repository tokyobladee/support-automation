import { VectorIndex } from "./ports.js";

export class InMemoryVectorIndex extends VectorIndex {
  constructor() {
    super();
    this.chunks = new Map();
  }

  async upsertChunks(chunks) {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  async search({ embedding, topK = 5 }) {
    return [...this.chunks.values()]
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(embedding, chunk.embedding ?? [])
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((first, second) => second.score - first.score)
      .slice(0, topK);
  }
}

function cosineSimilarity(first, second) {
  if (first.length === 0 || second.length === 0 || first.length !== second.length) {
    return 0;
  }

  return first.reduce((total, value, index) => total + value * second[index], 0);
}
