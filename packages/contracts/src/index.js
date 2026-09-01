import { z } from "zod";
import {
  automationEligibilityValues,
  knowledgeVisibilityValues,
  priorityValues,
  reviewReasonValues,
  ticketCategoryValues
} from "@support/domain";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("support-api")
});

export const ticketIntakeSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  source: z.enum(["manual", "api", "webhook", "slack", "crm"]).default("manual"),
  customerId: z.string().trim().min(1).max(128).optional(),
  externalId: z.string().trim().min(1).max(128).optional()
});

export const classificationRequestSchema = ticketIntakeSchema.extend({
  subject: z.string().trim().min(1).max(240).optional()
});

export const classificationResponseSchema = z.object({
  category: z.enum(ticketCategoryValues),
  priority: z.enum(priorityValues),
  automationEligibility: z.enum(automationEligibilityValues),
  confidence: z.number().min(0).max(1),
  recommendedNextStep: z.string().trim().min(1).max(1000),
  rationale: z.string().trim().min(1).max(2000),
  reviewReasons: z.array(z.enum(reviewReasonValues)),
  evidence: z.array(
    z.object({
      quote: z.string().trim().min(1).max(500),
      reason: z.string().trim().min(1).max(500)
    })
  )
});

export const knowledgeDocumentInputSchema = z.object({
  title: z.string().trim().min(1).max(240),
  source: z.string().trim().min(1).max(120),
  sourceUri: z.string().trim().url().optional(),
  version: z.string().trim().min(1).max(80),
  language: z.string().trim().min(2).max(12).default("en"),
  visibility: z.enum(knowledgeVisibilityValues).default("internal"),
  tags: z.array(z.string().trim().min(1).max(48)).default([]),
  validFrom: z.string().trim().datetime().optional(),
  validUntil: z.string().trim().datetime().optional(),
  content: z.string().trim().min(1).max(100000)
});

export const knowledgeChunkSchema = z.object({
  id: z.string().trim().min(1),
  documentId: z.string().trim().min(1),
  position: z.number().int().min(0),
  content: z.string().trim().min(1),
  contentHash: z.string().trim().min(64).max(64),
  tokenCount: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const knowledgeDocumentSchema = knowledgeDocumentInputSchema.omit({ content: true }).extend({
  id: z.string().trim().min(1),
  contentHash: z.string().trim().min(64).max(64),
  chunks: z.array(knowledgeChunkSchema)
});

export const knowledgeSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  topK: z.number().int().min(1).max(20).default(5),
  language: z.string().trim().min(2).max(12).optional(),
  tags: z.array(z.string().trim().min(1).max(48)).default([])
});

export const knowledgeCitationSchema = z.object({
  documentId: z.string().trim().min(1),
  chunkId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  source: z.string().trim().min(1),
  sourceUri: z.string().trim().url().optional(),
  version: z.string().trim().min(1),
  language: z.string().trim().min(2),
  position: z.number().int().min(0),
  quote: z.string().trim().min(1),
  relevanceScore: z.number().min(0).max(1),
  tags: z.array(z.string())
});

export const knowledgeSearchResponseSchema = z.object({
  query: z.string().trim().min(1),
  citations: z.array(knowledgeCitationSchema)
});

export const replyToneValues = Object.freeze(["formal", "empathetic", "concise"]);

export const copilotRequestSchema = classificationRequestSchema.extend({
  topK: z.number().int().min(1).max(10).default(5),
  classification: classificationResponseSchema.optional()
});

export const replyVariantSchema = z.object({
  tone: z.enum(replyToneValues),
  subject: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(4000),
  citationChunkIds: z.array(z.string().trim().min(1))
});

export const copilotDraftResponseSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  replyVariants: z.array(replyVariantSchema).min(1).max(3),
  reviewReasons: z.array(z.enum(reviewReasonValues))
});

export const copilotResponseSchema = copilotDraftResponseSchema.extend({
  classification: classificationResponseSchema,
  citations: z.array(knowledgeCitationSchema),
  automationEligibility: z.enum(automationEligibilityValues)
});

export const agentFeedbackDecisionValues = Object.freeze([
  "accepted",
  "edited",
  "rejected",
  "escalated",
  "marked_bad_output"
]);

export const agentFeedbackInputSchema = z.object({
  draftId: z.string().trim().min(1).max(128),
  decision: z.enum(agentFeedbackDecisionValues),
  tone: z.enum(replyToneValues).optional(),
  editedContent: z.string().trim().min(1).max(6000).optional(),
  reason: z.string().trim().min(1).max(1000).optional()
});

export const agentFeedbackSchema = agentFeedbackInputSchema.extend({
  id: z.string().trim().min(1),
  createdAt: z.string().datetime()
});
