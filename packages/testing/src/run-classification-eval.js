import {
  InMemoryClassificationRepository,
  MockTicketClassifierProvider,
  TicketClassificationService
} from "@support/ai";
import { evaluateClassifier, syntheticTicketSeeds } from "./index.js";

const thresholds = Object.freeze({
  accuracy: 0.8,
  invalidSchemaRate: 0,
  blockedAutomationAccuracy: 1
});

const service = new TicketClassificationService({
  provider: new MockTicketClassifierProvider(),
  repository: new InMemoryClassificationRepository()
});

const report = await evaluateClassifier({
  service,
  cases: syntheticTicketSeeds
});

const failedCases = report.results
  .filter((result) => !result.passed)
  .map((result) => ({
    id: result.id,
    expected: result.expected,
    actual: result.actual ?? null,
    error: result.error ?? null
  }));

const output = {
  summary: {
    total: report.total,
    passed: report.passed,
    failed: report.failed,
    accuracy: report.accuracy,
    categoryAccuracy: report.categoryAccuracy,
    priorityAccuracy: report.priorityAccuracy,
    automationEligibilityAccuracy: report.automationEligibilityAccuracy,
    invalidOutputCount: report.invalidOutputCount,
    invalidSchemaRate: report.invalidSchemaRate,
    blockedAutomationAccuracy: report.blockedAutomationAccuracy,
    thresholds
  },
  failedCases
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

if (
  report.accuracy < thresholds.accuracy ||
  report.invalidSchemaRate > thresholds.invalidSchemaRate ||
  report.blockedAutomationAccuracy < thresholds.blockedAutomationAccuracy
) {
  process.exitCode = 1;
}
