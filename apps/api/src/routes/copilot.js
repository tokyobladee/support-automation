import { copilotRequestSchema } from "@support/contracts";

function toValidationIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

export async function registerCopilotRoutes(app, options) {
  const copilotService = options.copilotService;

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
        aiRun: draft.aiRun
      }
    });
  });
}
