export function recordAiRunMetrics(metricsRecorder, aiRun) {
  if (!aiRun) {
    return;
  }

  metricsRecorder.recordAiRun({
    purpose: aiRun.prompt?.purpose ?? "unknown",
    provider: aiRun.provider,
    model: aiRun.model,
    promptVersion: aiRun.promptVersion,
    latencyMs: calculateLatencyMs(aiRun.startedAt, aiRun.finishedAt),
    inputTokens: aiRun.inputTokens,
    outputTokens: aiRun.outputTokens,
    costUsd: aiRun.costUsd
  });
}

export function recordValidationErrorMetrics(metricsRecorder, { route, error }) {
  metricsRecorder.recordSchemaValidationError({
    route,
    issueCount: error.issues.length
  });
}

export function recordRetrievalMetrics(metricsRecorder, result) {
  metricsRecorder.recordRetrieval({
    query: result.query,
    resultCount: result.citations.length
  });
}

export function recordHumanDecisionMetrics(metricsRecorder, feedback) {
  metricsRecorder.recordHumanDecision({
    decision: feedback.decision,
    draftId: feedback.draftId,
    tone: feedback.tone
  });
}

function calculateLatencyMs(startedAt, finishedAt) {
  if (!(startedAt instanceof Date) || !(finishedAt instanceof Date)) {
    return undefined;
  }

  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}
