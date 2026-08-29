export class InMemoryClassificationRepository {
  constructor() {
    this.records = [];
  }

  async saveClassification(record) {
    this.records.push(record);
    return record;
  }

  all() {
    return [...this.records];
  }
}
