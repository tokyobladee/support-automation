export async function evaluateCopilot({ service, cases }) {
  const results = [];

  for (const caseItem of cases) {
    try {
      const output = await service.draftReply(caseItem.input);
      const actual = output.result;
      const toneMatched = expectedTonesMatched(actual, caseItem.expected);
      const citationMatched = expectedCitationsMatched(actual, caseItem.expected);
      const eligibilityMatched =
        actual.automationEligibility === caseItem.expected.automationEligibility;
      const reviewReasonsMatched = expectedReviewReasonsMatched(actual, caseItem.expected);
      const citationIntegrityMatched = citationsStayInsideRetrievedContext(actual);

      results.push({
        id: caseItem.id,
        passed:
          toneMatched &&
          citationMatched &&
          eligibilityMatched &&
          reviewReasonsMatched &&
          citationIntegrityMatched,
        toneMatched,
        citationMatched,
        eligibilityMatched,
        reviewReasonsMatched,
        citationIntegrityMatched,
        expected: caseItem.expected,
        actual,
        aiRun: output.aiRun
      });
    } catch (error) {
      results.push({
        id: caseItem.id,
        passed: false,
        invalidOutput: true,
        error: error.message
      });
    }
  }

  return summarizeCopilotResults(results);
}

function summarizeCopilotResults(results) {
  const passedCount = results.filter((result) => result.passed).length;
  const invalidOutputCount = results.filter((result) => result.invalidOutput).length;
  const toneMatches = results.filter((result) => result.toneMatched).length;
  const citationMatches = results.filter((result) => result.citationMatched).length;
  const eligibilityMatches = results.filter((result) => result.eligibilityMatched).length;
  const reviewReasonMatches = results.filter((result) => result.reviewReasonsMatched).length;
  const citationIntegrityMatches = results.filter(
    (result) => result.citationIntegrityMatched
  ).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    accuracy: results.length === 0 ? 0 : passedCount / results.length,
    toneAccuracy: results.length === 0 ? 0 : toneMatches / results.length,
    citationAccuracy: results.length === 0 ? 0 : citationMatches / results.length,
    automationEligibilityAccuracy: results.length === 0 ? 0 : eligibilityMatches / results.length,
    reviewReasonAccuracy: results.length === 0 ? 0 : reviewReasonMatches / results.length,
    citationIntegrityAccuracy:
      results.length === 0 ? 0 : citationIntegrityMatches / results.length,
    invalidOutputCount,
    invalidSchemaRate: results.length === 0 ? 0 : invalidOutputCount / results.length,
    results
  };
}

function expectedTonesMatched(actual, expected) {
  const tones = new Set(actual.replyVariants.map((variant) => variant.tone));

  return expected.tones.every((tone) => tones.has(tone));
}

function expectedCitationsMatched(actual, expected) {
  if (!expected.requiresCitation) {
    return true;
  }

  return actual.citations.length > 0;
}

function expectedReviewReasonsMatched(actual, expected) {
  return expected.reviewReasons.every((reason) => actual.reviewReasons.includes(reason));
}

function citationsStayInsideRetrievedContext(actual) {
  const citationChunkIds = new Set(actual.citations.map((citation) => citation.chunkId));

  return actual.replyVariants.every((variant) =>
    variant.citationChunkIds.every((chunkId) => citationChunkIds.has(chunkId))
  );
}
