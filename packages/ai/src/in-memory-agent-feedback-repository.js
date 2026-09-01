import { agentFeedbackSchema } from "@support/contracts";

export class InMemoryAgentFeedbackRepository {
  constructor({ idFactory = () => crypto.randomUUID(), clock = () => new Date() } = {}) {
    this.records = [];
    this.idFactory = idFactory;
    this.clock = clock;
  }

  async saveFeedback(input) {
    const record = agentFeedbackSchema.parse({
      ...input,
      id: this.idFactory(),
      createdAt: this.clock().toISOString()
    });

    this.records.push(record);

    return record;
  }

  async listFeedback() {
    return [...this.records];
  }
}
