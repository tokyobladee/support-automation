export class MetricsRecorder {
  recordAiRun(_event) {
    throw new Error("MetricsRecorder.recordAiRun must be implemented");
  }

  recordSchemaValidationError(_event) {
    throw new Error("MetricsRecorder.recordSchemaValidationError must be implemented");
  }

  recordRetrieval(_event) {
    throw new Error("MetricsRecorder.recordRetrieval must be implemented");
  }

  recordHumanDecision(_event) {
    throw new Error("MetricsRecorder.recordHumanDecision must be implemented");
  }

  snapshot() {
    throw new Error("MetricsRecorder.snapshot must be implemented");
  }
}

export class InMemoryMetricsRecorder extends MetricsRecorder {
  constructor({ clock = () => new Date() } = {}) {
    super();
    this.clock = clock;
    this.aiRuns = [];
    this.schemaValidationErrors = [];
    this.retrievals = [];
    this.humanDecisions = [];
  }

  recordAiRun(event) {
    this.aiRuns.push({
      recordedAt: this.clock().toISOString(),
      ...event
    });
  }

  recordSchemaValidationError(event) {
    this.schemaValidationErrors.push({
      recordedAt: this.clock().toISOString(),
      ...event
    });
  }

  recordRetrieval(event) {
    this.retrievals.push({
      recordedAt: this.clock().toISOString(),
      ...event
    });
  }

  recordHumanDecision(event) {
    this.humanDecisions.push({
      recordedAt: this.clock().toISOString(),
      ...event
    });
  }

  snapshot() {
    return {
      ai: summarizeAiRuns(this.aiRuns),
      schemas: summarizeSchemaValidation(this.schemaValidationErrors),
      retrieval: summarizeRetrievals(this.retrievals),
      decisions: summarizeHumanDecisions(this.humanDecisions)
    };
  }
}

export function createNoopMetricsRecorder() {
  return new NoopMetricsRecorder();
}

class NoopMetricsRecorder extends MetricsRecorder {
  recordAiRun() {}

  recordSchemaValidationError() {}

  recordRetrieval() {}

  recordHumanDecision() {}

  snapshot() {
    return {
      ai: summarizeAiRuns([]),
      schemas: summarizeSchemaValidation([]),
      retrieval: summarizeRetrievals([]),
      decisions: summarizeHumanDecisions([])
    };
  }
}

function summarizeAiRuns(aiRuns) {
  const latencies = aiRuns
    .map((event) => event.latencyMs)
    .filter((value) => Number.isFinite(value));
  const tokenUsage = aiRuns.reduce(
    (totals, event) => ({
      inputTokens: totals.inputTokens + (event.inputTokens ?? 0),
      outputTokens: totals.outputTokens + (event.outputTokens ?? 0)
    }),
    {
      inputTokens: 0,
      outputTokens: 0
    }
  );

  return {
    totalRuns: aiRuns.length,
    byPurpose: countBy(aiRuns, "purpose"),
    byProvider: countBy(aiRuns, "provider"),
    latencyMs: {
      average: average(latencies),
      max: latencies.length === 0 ? 0 : Math.max(...latencies)
    },
    tokenUsage,
    costUsd: sum(aiRuns.map((event) => event.costUsd ?? 0))
  };
}

function summarizeSchemaValidation(errors) {
  return {
    totalErrors: errors.length,
    byRoute: countBy(errors, "route")
  };
}

function summarizeRetrievals(retrievals) {
  const hits = retrievals.filter((event) => event.resultCount > 0).length;

  return {
    totalQueries: retrievals.length,
    hits,
    misses: retrievals.length - hits,
    hitRate: retrievals.length === 0 ? 0 : hits / retrievals.length,
    averageResultCount: average(retrievals.map((event) => event.resultCount))
  };
}

function summarizeHumanDecisions(decisions) {
  return {
    totalDecisions: decisions.length,
    byDecision: countBy(decisions, "decision"),
    escalationCount: decisions.filter((event) => event.decision === "escalated").length
  };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";

    return {
      ...counts,
      [value]: (counts[value] ?? 0) + 1
    };
  }, {});
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
