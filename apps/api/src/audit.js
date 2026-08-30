export async function recordAiRunAuditEvent(auditLog, aiRun) {
  if (!aiRun) {
    return;
  }

  await auditLog.recordAiRun({
    purpose: aiRun.prompt?.purpose ?? "unknown",
    provider: aiRun.provider,
    model: aiRun.model,
    promptVersion: aiRun.promptVersion,
    promptHash: aiRun.prompt?.promptHash,
    startedAt: aiRun.startedAt?.toISOString(),
    finishedAt: aiRun.finishedAt?.toISOString()
  });
}

export async function recordHumanDecisionAuditEvent(auditLog, feedback) {
  await auditLog.recordHumanDecision({
    draftId: feedback.draftId,
    decision: feedback.decision,
    tone: feedback.tone,
    hasEditedContent: Boolean(feedback.editedContent),
    hasReason: Boolean(feedback.reason),
    reasonLength: feedback.reason?.length ?? 0
  });
}
