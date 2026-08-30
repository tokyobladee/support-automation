import { agentFeedbackInputSchema, copilotRequestSchema } from "@support/contracts";
import { FeedbackDraftNotFoundError } from "@support/database";
import {
  recordAiRunMetrics,
  recordHumanDecisionMetrics,
  recordValidationErrorMetrics
} from "../metrics.js";

function toValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

export async function registerCopilotRoutes(app, options) {
  const copilotService = options.copilotService;
  const feedbackRepository = options.feedbackRepository;
  const metricsRecorder = options.metricsRecorder;

  app.post("/v1/copilot/drafts", async (request, reply) => {
    const parsed = copilotRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      recordValidationErrorMetrics(metricsRecorder, {
        route: "POST /v1/copilot/drafts",
        error: parsed.error
      });

      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid copilot draft request",
          issues: toValidationIssues(parsed.error)
        }
      });
    }

    const draft = await copilotService.draftReply(parsed.data);
    recordAiRunMetrics(metricsRecorder, draft.aiRun);

    return reply.code(201).send({
      data: draft.result,
      meta: {
        aiRun: draft.aiRun,
        draftId: draft.id
      }
    });
  });

  app.post("/v1/copilot/feedback", async (request, reply) => {
    const parsed = agentFeedbackInputSchema.safeParse(request.body);

    if (!parsed.success) {
      recordValidationErrorMetrics(metricsRecorder, {
        route: "POST /v1/copilot/feedback",
        error: parsed.error
      });

      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid agent feedback request",
          issues: toValidationIssues(parsed.error)
        }
      });
    }

    let feedback;

    try {
      feedback = await feedbackRepository.saveFeedback(parsed.data);
    } catch (error) {
      if (error instanceof FeedbackDraftNotFoundError) {
        return reply.code(404).send({
          error: {
            code: "DRAFT_NOT_FOUND",
            message: "Copilot draft was not found"
          }
        });
      }

      throw error;
    }

    recordHumanDecisionMetrics(metricsRecorder, feedback);

    return reply.code(201).send({
      data: feedback
    });
  });

  app.get("/v1/copilot/feedback", async () => ({
    data: await feedbackRepository.listFeedback()
  }));
}
