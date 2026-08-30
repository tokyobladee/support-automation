import { SpanStatusCode, trace } from "@opentelemetry/api";

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

export class TraceRecorder {
  async trace(_name, _options, _operation) {
    throw new Error("TraceRecorder.trace must be implemented");
  }

  startSpan(_name, _options) {
    throw new Error("TraceRecorder.startSpan must be implemented");
  }
}

export class OpenTelemetryTraceRecorder extends TraceRecorder {
  constructor({ tracer = trace.getTracer("support-ai-copilot") } = {}) {
    super();
    this.tracer = tracer;
  }

  async trace(name, options, operation) {
    return await this.tracer.startActiveSpan(name, toSpanOptions(options), async (span) => {
      try {
        const result = await operation(span);

        span.setStatus({
          code: SpanStatusCode.OK
        });

        return result;
      } catch (error) {
        recordSpanError({ span, error });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  startSpan(name, options = {}) {
    const span = this.tracer.startSpan(name, toSpanOptions(options));

    return {
      setAttribute(key, value) {
        if (isTraceAttributeValue(value)) {
          span.setAttribute(key, value);
        }
      },
      end(error) {
        if (error) {
          recordSpanError({ span, error });
        } else {
          span.setStatus({
            code: SpanStatusCode.OK
          });
        }

        span.end();
      }
    };
  }
}

export class InMemoryTraceRecorder extends TraceRecorder {
  constructor() {
    super();
    this.spans = [];
  }

  async trace(name, options, operation) {
    const span = this.startSpan(name, options);

    try {
      const result = await operation(span);

      span.end();

      return result;
    } catch (error) {
      span.end(error);
      throw error;
    }
  }

  startSpan(name, options = {}) {
    const record = {
      name,
      attributes: sanitizeAttributes(options.attributes ?? {}),
      status: "started"
    };

    this.spans.push(record);

    return {
      setAttribute(key, value) {
        if (isTraceAttributeValue(value)) {
          record.attributes[key] = value;
        }
      },
      end(error) {
        record.status = error ? "error" : "ok";
        record.errorName = error?.name;
        record.errorMessage = error?.message;
      }
    };
  }

  snapshot() {
    return this.spans.map((span) => ({
      ...span,
      attributes: {
        ...span.attributes
      }
    }));
  }
}

export function createNoopTraceRecorder() {
  return new NoopTraceRecorder();
}

export function instrumentMethods({ target, traceRecorder, spans }) {
  return new Proxy(target, {
    get(currentTarget, property, receiver) {
      const value = Reflect.get(currentTarget, property, receiver);
      const spanConfig = spans[property];

      if (!spanConfig || typeof value !== "function") {
        return value;
      }

      return async (...args) =>
        await traceRecorder.trace(spanConfig.name, spanConfig.options(args), async () =>
          await value.apply(currentTarget, args)
        );
    }
  });
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

class NoopTraceRecorder extends TraceRecorder {
  async trace(_name, _options, operation) {
    return await operation();
  }

  startSpan() {
    return {
      setAttribute() {},
      end() {}
    };
  }
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

function toSpanOptions(options = {}) {
  return {
    attributes: sanitizeAttributes(options.attributes ?? {})
  };
}

function sanitizeAttributes(attributes) {
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => isTraceAttributeValue(value))
  );
}

function isTraceAttributeValue(value) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === "string" || typeof item === "number" || typeof item === "boolean"
      ))
  );
}

function recordSpanError({ span, error }) {
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message
  });
}
