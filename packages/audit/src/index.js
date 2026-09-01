export class AuditLog {
  async recordAiRun(_event) {
    throw new Error("AuditLog.recordAiRun must be implemented");
  }

  async recordHumanDecision(_event) {
    throw new Error("AuditLog.recordHumanDecision must be implemented");
  }

  async listEvents(_query) {
    throw new Error("AuditLog.listEvents must be implemented");
  }
}

export class InMemoryAuditLog extends AuditLog {
  constructor({ idFactory = () => crypto.randomUUID(), clock = () => new Date() } = {}) {
    super();
    this.idFactory = idFactory;
    this.clock = clock;
    this.events = [];
  }

  async recordAiRun(event) {
    return this.append({
      type: "ai_run_completed",
      actorType: "ai",
      payload: event
    });
  }

  async recordHumanDecision(event) {
    return this.append({
      type: "human_decision_recorded",
      actorType: "user",
      payload: event
    });
  }

  async listEvents(query = {}) {
    const limit = query.limit ?? 50;
    const type = query.type;
    const filteredEvents = type
      ? this.events.filter((event) => event.type === type)
      : this.events;

    return filteredEvents.slice(0, limit);
  }

  append(event) {
    const record = {
      id: this.idFactory(),
      type: event.type,
      actorType: event.actorType,
      payload: event.payload,
      createdAt: this.clock().toISOString()
    };

    this.events.unshift(record);

    return record;
  }
}

export function createNoopAuditLog() {
  return new NoopAuditLog();
}

class NoopAuditLog extends AuditLog {
  async recordAiRun() {}

  async recordHumanDecision() {}

  async listEvents() {
    return [];
  }
}
