import { classificationRequestSchema } from "@support/contracts";
import { recordAiRunMetrics, recordValidationErrorMetrics } from "../metrics.js";

function toValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

export async function registerClassificationRoutes(app, options) {
  const classificationService = options.classificationService;
  const metricsRecorder = options.metricsRecorder;

  app.post("/v1/classifications", async (request, reply) => {
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
    recordAiRunMetrics(metricsRecorder, result.aiRun);

    return reply.code(201).send({
      data: result.classification,
      meta: {
        aiRun: result.aiRun
      }
    });
  });
}
