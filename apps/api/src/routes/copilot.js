import { agentFeedbackInputSchema, copilotRequestSchema } from "@support/contracts";

function toValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

export async function registerCopilotRoutes(app, options) {
  const copilotService = options.copilotService;
  const feedbackRepository = options.feedbackRepository;

  app.post("/v1/copilot/drafts", async (request, reply) => {
    const parsed = copilotRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid copilot draft request",
          issues: toValidationIssues(parsed.error)
        }
      });
    }

    const draft = await copilotService.draftReply(parsed.data);

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
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid agent feedback request",
          issues: toValidationIssues(parsed.error)
        }
      });
    }

    const feedback = await feedbackRepository.saveFeedback(parsed.data);

    return reply.code(201).send({
      data: feedback
    });
  });

  app.get("/v1/copilot/feedback", async () => ({
    data: await feedbackRepository.listFeedback()
  }));
}
