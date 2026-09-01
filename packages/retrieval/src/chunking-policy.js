import { createContentHash, normalizeContent } from "./content-hash.js";

export class ChunkingPolicy {
  constructor({ maxWords = 120, overlapWords = 24 } = {}) {
    this.maxWords = maxWords;
    this.overlapWords = overlapWords;
  }

  split({ documentId, content }) {
    const words = normalizeContent(content).split(" ").filter(Boolean);
    const chunks = [];
    let position = 0;
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + this.maxWords, words.length);
      const chunkContent = words.slice(start, end).join(" ");

      chunks.push({
        id: `${documentId}:chunk:${position}`,
        documentId,
        position,
        content: chunkContent,
        contentHash: createContentHash(chunkContent),
        tokenCount: words.slice(start, end).length,
        metadata: {}
      });

      if (end === words.length) {
        break;
      }

      start = Math.max(end - this.overlapWords, start + 1);
      position += 1;
    }

    return chunks;
  }
}
