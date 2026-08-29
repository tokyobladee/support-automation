import { z } from "zod";
import {
  automationEligibilityValues,
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
