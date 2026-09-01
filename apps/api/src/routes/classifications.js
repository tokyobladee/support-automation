import { classificationRequestSchema } from "@support/contracts";
import { permissions } from "@support/auth";
import { recordAiRunAuditEvent } from "../audit.js";
import { requirePermission } from "../auth.js";
import { recordAiRunMetrics, recordValidationErrorMetrics } from "../metrics.js";

function toValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

export async function registerClassificationRoutes(app, options) {
  const classificationService = options.classificationService;
  const authContext = options.authContext;
  const auditLog = options.auditLog;
  const metricsRecorder = options.metricsRecorder;

  app.post("/v1/classifications", async (request, reply) => {
    const user = await requirePermission({
      authContext,
      request,
      reply,
      permission: permissions.classifyTickets
    });

    if (!user) {
      return;
    }

    const parsed = classificationRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      recordValidationErrorMetrics(metricsRecorder, {
        route: "POST /v1/classifications",
        error: parsed.error
      });

      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid classification request",
          issues: toValidationIssues(parsed.error)
        }
      });
    }

    const result = await classificationService.classify(parsed.data);
    await recordAiRunAuditEvent(auditLog, result.aiRun);
    recordAiRunMetrics(metricsRecorder, result.aiRun);

    return reply.code(201).send({
      data: result.classification,
      meta: {
        aiRun: result.aiRun
      }
    });
  });
}
