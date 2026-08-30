import { copilotDraftResponseSchema, copilotRequestSchema, copilotResponseSchema } from "@support/contracts";
import { resolveAutomationPolicy, reviewReasons } from "@support/domain";
import { buildCopilotPrompt } from "./copilot-prompt.js";

export class CopilotService {
  constructor({
    classificationService,
    provider,
    knowledgeRetriever,
    repository,
    clock = () => new Date(),
    idFactory = () => crypto.randomUUID()
  }) {
    this.classificationService = classificationService;
    this.provider = provider;
    this.knowledgeRetriever = knowledgeRetriever;
    this.repository = repository;
    this.clock = clock;
    this.idFactory = idFactory;
  }

  async draftReply(input) {
    const request = copilotRequestSchema.parse(input);
    const startedAt = this.clock();
    const classificationResult = await this.classificationService.classify(request);
    const classification = classificationResult.classification;
    const retrievalResult = await this.knowledgeRetriever.search({
      query: buildRetrievalQuery({ request, classification }),
      topK: request.topK
    });
    const citations = retrievalResult.citations;
    const prompt = buildCopilotPrompt({
      request,
      classification,
      citations
    });
    const providerOutput = await this.provider.generateReplyVariants({
      request,
      classification,
      citations,
      prompt
    });
    const draft = copilotDraftResponseSchema.parse(providerOutput);
    const reviewReasonSet = new Set([...classification.reviewReasons, ...draft.reviewReasons]);

    if (citations.length === 0) {
      reviewReasonSet.add(reviewReasons.missingKnowledgeCitation);
    }

    const policy = resolveAutomationPolicy({
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence,
      reviewReasons: [...reviewReasonSet]
    });
    const result = copilotResponseSchema.parse({
      summary: draft.summary,
      replyVariants: sanitizeReplyVariants({
        variants: draft.replyVariants,
        citations
      }),
      reviewReasons: policy.reviewReasons,
      classification,
      citations,
      automationEligibility: policy.eligibility
    });
    const record = {
      id: this.idFactory(),
      request,
      result,
      aiRun: {
        provider: this.provider.name,
        model: this.provider.model,
        promptVersion: prompt.version,
        startedAt,
        finishedAt: this.clock()
      }
    };

    if (this.repository) {
      await this.repository.saveCopilotDraft(record);
    }

    return record;
  }
}

function buildRetrievalQuery({ request, classification }) {
  return [
    request.subject,
    request.text,
    classification.category,
    classification.priority,
    classification.recommendedNextStep
  ]
    .filter(Boolean)
    .join(" ");
}

function sanitizeReplyVariants({ variants, citations }) {
  const allowedCitationIds = new Set(citations.map((citation) => citation.chunkId));

  return variants.map((variant) => ({
    ...variant,
    citationChunkIds: variant.citationChunkIds.filter((chunkId) => allowedCitationIds.has(chunkId))
  }));
}
