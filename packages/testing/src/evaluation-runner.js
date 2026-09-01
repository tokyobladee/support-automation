import {
  CopilotService,
  InMemoryClassificationRepository,
  InMemoryCopilotRepository,
  MockTicketClassifierProvider,
  TicketClassificationService
} from "@support/ai";
import { buildSeededKnowledgeContext } from "@support/retrieval";
import {
  copilotEvaluationSeeds,
  evaluateClassifier,
  evaluateCopilot,
  syntheticTicketSeeds
} from "./index.js";

const defaultThresholds = Object.freeze({
  classification: {
    accuracy: 0.8,
    invalidSchemaRate: 0,
    blockedAutomationAccuracy: 1
  },
  copilot: {
    accuracy: 1,
    invalidSchemaRate: 0,
    citationIntegrityAccuracy: 1,
    citationAccuracy: 1
  }
});

export async function runEvaluationSuite({
  thresholds = defaultThresholds,
  classificationCases = syntheticTicketSeeds,
  copilotCases = copilotEvaluationSeeds
} = {}) {
  const provider = new MockTicketClassifierProvider();
  const classificationService = new TicketClassificationService({
    provider,
    repository: new InMemoryClassificationRepository()
  });
  const knowledgeContext = await buildSeededKnowledgeContext();
  const copilotService = new CopilotService({
    classificationService,
    provider,
    knowledgeRetriever: knowledgeContext.retriever,
    repository: new InMemoryCopilotRepository()
  });
  const classification = await evaluateClassifier({
    service: classificationService,
    cases: classificationCases
  });
  const copilot = await evaluateCopilot({
    service: copilotService,
    cases: copilotCases
  });

  return {
    passed:
      classificationPassed(classification, thresholds.classification) &&
      copilotPassed(copilot, thresholds.copilot),
    metadata: createEvaluationMetadata({ classification, copilot }),
    thresholds,
    classification,
    copilot
  };
}

function createEvaluationMetadata({ classification, copilot }) {
  return {
    generatedAt: new Date().toISOString(),
    promptRuns: [
      ...collectPromptRuns(classification.results),
      ...collectPromptRuns(copilot.results)
    ]
  };
}

function collectPromptRuns(results) {
  const promptRuns = new Map();

  for (const result of results) {
    const prompt = result.actual?.prompt ?? result.aiRun?.prompt;

    if (!prompt) {
      continue;
    }

    const key = [
      prompt.purpose,
      prompt.version,
      prompt.provider,
      prompt.model,
      prompt.schemaName
    ].join(":");
    const existing = promptRuns.get(key);

    if (existing) {
      existing.caseCount += 1;
      existing.promptHashes.add(prompt.promptHash);
      continue;
    }

    promptRuns.set(key, {
      purpose: prompt.purpose,
      version: prompt.version,
      schemaName: prompt.schemaName,
      provider: prompt.provider,
      model: prompt.model,
      caseCount: 1,
      promptHashes: new Set([prompt.promptHash])
    });
  }

  return [...promptRuns.values()].map((promptRun) => ({
    ...promptRun,
    uniquePromptHashCount: promptRun.promptHashes.size,
    promptHashes: [...promptRun.promptHashes].slice(0, 3)
  }));
}

export { defaultThresholds };

function classificationPassed(report, thresholds) {
  return (
    report.accuracy >= thresholds.accuracy &&
    report.invalidSchemaRate <= thresholds.invalidSchemaRate &&
    report.blockedAutomationAccuracy >= thresholds.blockedAutomationAccuracy
  );
}

function copilotPassed(report, thresholds) {
  return (
    report.accuracy >= thresholds.accuracy &&
    report.invalidSchemaRate <= thresholds.invalidSchemaRate &&
    report.citationIntegrityAccuracy >= thresholds.citationIntegrityAccuracy &&
    report.citationAccuracy >= thresholds.citationAccuracy
  );
}
