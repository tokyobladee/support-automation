import { createHash } from "node:crypto";
import { EmbeddingProvider } from "./ports.js";

export class HashEmbeddingProvider extends EmbeddingProvider {
  constructor({ dimensions = 32 } = {}) {
    super();
    this.dimensions = dimensions;
  }

  async embedText({ text }) {
    const vector = new Array(this.dimensions).fill(0);
    const terms = tokenize(text);

    for (const term of terms) {
      const hash = createHash("sha256").update(term).digest();

      for (let index = 0; index < this.dimensions; index += 1) {
        vector[index] += (hash[index % hash.length] / 255) * 2 - 1;
      }
    }

    return normalizeVector(vector);
  }
}

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .split(/[^a-zа-яіїєґ0-9]+/iu)
    .filter((term) => term.length > 2);
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((total, value) => total + value ** 2, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}
