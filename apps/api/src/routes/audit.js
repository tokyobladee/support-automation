import { z } from "zod";

const auditQuerySchema = z.object({
  type: z.enum(["ai_run_completed", "human_decision_recorded"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

function toValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

export async function registerAuditRoutes(app, options) {
  const auditLog = options.auditLog;

  app.get("/v1/audit/events", async (request, reply) => {
    const parsed = auditQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid audit event query",
          issues: toValidationIssues(parsed.error)
        }
      });
    }

    const events = await auditLog.listEvents(parsed.data);

    return {
      data: events
    };
  });
}
