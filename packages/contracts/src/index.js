import { z } from "zod";

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
