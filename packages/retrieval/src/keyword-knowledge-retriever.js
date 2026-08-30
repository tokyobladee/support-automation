import { knowledgeSearchRequestSchema, knowledgeSearchResponseSchema } from "@support/contracts";
import { normalizeContent } from "./content-hash.js";
import { KnowledgeRetriever } from "./ports.js";

export class KeywordKnowledgeRetriever extends KnowledgeRetriever {
  constructor({ repository }) {
    super();
    this.repository = repository;
  }

  async search(input) {
    const request = knowledgeSearchRequestSchema.parse(input);
    const queryTerms = tokenize(request.query);
    const chunks = await this.repository.listChunks();
    const ranked = chunks
      .filter((chunk) => matchesFilters({ chunk, request }))
      .map((chunk) => ({
        chunk,
        score: scoreChunk({ chunk, queryTerms })
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((first, second) => second.score - first.score)
      .slice(0, request.topK)
      .map(({ chunk, score }) => toCitation({ chunk, score }));

    return knowledgeSearchResponseSchema.parse({
      query: request.query,
      citations: ranked
    });
  }
}

function matchesFilters({ chunk, request }) {
  if (request.language && chunk.document.language !== request.language) {
    return false;
  }

  if (request.tags.length === 0) {
    return true;
  }

  return request.tags.every((tag) => chunk.document.tags.includes(tag));
}

function scoreChunk({ chunk, queryTerms }) {
  const contentTerms = tokenize(chunk.content);
  const titleTerms = tokenize(chunk.document.title);
  const tagTerms = chunk.document.tags.flatMap(tokenize);
  const contentMatches = countMatches({ queryTerms, candidateTerms: contentTerms });
  const titleMatches = countMatches({ queryTerms, candidateTerms: titleTerms });
  const tagMatches = countMatches({ queryTerms, candidateTerms: tagTerms });
  const weightedScore = contentMatches + titleMatches * 2 + tagMatches * 1.5;

  return Math.min(1, weightedScore / Math.max(queryTerms.length, 1));
}

function countMatches({ queryTerms, candidateTerms }) {
  const candidates = new Set(candidateTerms);

  return queryTerms.filter((term) => candidates.has(term)).length;
}

function tokenize(value) {
  return normalizeContent(value)
    .toLowerCase()
    .split(/[^a-zа-яіїєґ0-9]+/iu)
    .filter((term) => term.length > 2);
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
