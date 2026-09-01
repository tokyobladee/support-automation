export class InMemoryCopilotRepository {
  constructor() {
    this.records = [];
  }

  async saveCopilotDraft(record) {
    this.records.push(record);
    return record;
  }

  all() {
    return [...this.records];
  }
}
