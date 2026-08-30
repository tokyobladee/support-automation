export async function evaluateClassifier({ service, cases }) {
  const results = [];

  for (const caseItem of cases) {
    try {
      const output = await service.classify(caseItem.input);
      const actual = output.classification;
      const categoryMatched = actual.category === caseItem.expected.category;
      const priorityMatched = actual.priority === caseItem.expected.priority;
      const eligibilityMatched =
        actual.automationEligibility === caseItem.expected.automationEligibility;

      results.push({
        id: caseItem.id,
        passed: categoryMatched && priorityMatched && eligibilityMatched,
        categoryMatched,
        priorityMatched,
        eligibilityMatched,
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

  return summarizeResults(results);
}

function summarizeResults(results) {
  const passedCount = results.filter((result) => result.passed).length;
  const invalidOutputCount = results.filter((result) => result.invalidOutput).length;
  const categoryMatches = results.filter((result) => result.categoryMatched).length;
  const priorityMatches = results.filter((result) => result.priorityMatched).length;
  const eligibilityMatches = results.filter((result) => result.eligibilityMatched).length;
  const blockedCases = results.filter(
    (result) => result.expected?.automationEligibility === "automation_blocked"
  );
  const blockedMatches = blockedCases.filter((result) => result.eligibilityMatched).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    accuracy: results.length === 0 ? 0 : passedCount / results.length,
    categoryAccuracy: results.length === 0 ? 0 : categoryMatches / results.length,
    priorityAccuracy: results.length === 0 ? 0 : priorityMatches / results.length,
    automationEligibilityAccuracy: results.length === 0 ? 0 : eligibilityMatches / results.length,
    invalidOutputCount,
    invalidSchemaRate: results.length === 0 ? 0 : invalidOutputCount / results.length,
    blockedAutomationAccuracy:
      blockedCases.length === 0 ? 0 : blockedMatches / blockedCases.length,
    results
  };
}
