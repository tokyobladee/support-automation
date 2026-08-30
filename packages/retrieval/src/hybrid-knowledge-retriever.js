import { knowledgeSearchRequestSchema, knowledgeSearchResponseSchema } from "@support/contracts";
import { KnowledgeRetriever } from "./ports.js";

export class HybridKnowledgeRetriever extends KnowledgeRetriever {
  constructor({ keywordRetriever, embeddingProvider, vectorIndex, keywordWeight = 0.55 }) {
    super();
    this.keywordRetriever = keywordRetriever;
    this.embeddingProvider = embeddingProvider;
    this.vectorIndex = vectorIndex;
    this.keywordWeight = keywordWeight;
  }

  async search(input) {
    const request = knowledgeSearchRequestSchema.parse(input);
    const [keywordResult, embedding] = await Promise.all([
      this.keywordRetriever.search(request),
      this.embeddingProvider.embedText({ text: request.query })
    ]);
    const vectorMatches = await this.vectorIndex.search({
      embedding,
      topK: request.topK,
      language: request.language,
      tags: request.tags
    });
    const merged = new Map();

    for (const citation of keywordResult.citations) {
      merged.set(citation.chunkId, {
        citation,
        keywordScore: citation.relevanceScore,
        vectorScore: 0
      });
    }

    for (const match of vectorMatches) {
      const existing = merged.get(match.chunk.id);
      const citation = existing?.citation ?? toCitation({ chunk: match.chunk, score: match.score });

      merged.set(match.chunk.id, {
        citation,
        keywordScore: existing?.keywordScore ?? 0,
        vectorScore: match.score
      });
    }

    const citations = [...merged.values()]
      .map((candidate) => ({
        ...candidate.citation,
        relevanceScore: combineScores({
          keywordScore: candidate.keywordScore,
          vectorScore: candidate.vectorScore,
          keywordWeight: this.keywordWeight
        })
      }))
      .sort((first, second) => second.relevanceScore - first.relevanceScore)
      .slice(0, request.topK);

    return knowledgeSearchResponseSchema.parse({
      query: request.query,
      citations
    });
  }
}

function combineScores({ keywordScore, vectorScore, keywordWeight }) {
  const vectorWeight = 1 - keywordWeight;

  return Math.min(1, keywordScore * keywordWeight + vectorScore * vectorWeight);
}

function toCitation({ chunk, score }) {
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
    relevanceScore: score,
    tags: chunk.document.tags
  };
}
