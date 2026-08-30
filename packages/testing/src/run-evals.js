import { runEvaluationSuite } from "./evaluation-runner.js";

const report = await runEvaluationSuite();

const output = {
  passed: report.passed,
  metadata: report.metadata,
  thresholds: report.thresholds,
  classification: toReportSummary(report.classification),
  copilot: toReportSummary(report.copilot),
  failedCases: {
    classification: toFailedCases(report.classification),
    copilot: toFailedCases(report.copilot)
  }
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

if (!report.passed) {
  process.exitCode = 1;
}

function toReportSummary(report) {
  const summary = { ...report };
  delete summary.results;

  return summary;
}

function toFailedCases(report) {
  return report.results
    .filter((result) => !result.passed)
    .map((result) => ({
      id: result.id,
      expected: result.expected,
      actual: result.actual ?? null,
      error: result.error ?? null
    }));
}
