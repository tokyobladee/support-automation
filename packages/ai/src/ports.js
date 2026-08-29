export class AiProvider {
  async classifyTicket(_request) {
    throw new Error("AiProvider.classifyTicket must be implemented");
  }

  async generateReplyVariants(_request) {
    throw new Error("AiProvider.generateReplyVariants must be implemented");
  }
}

export class ClassificationRepository {
  async saveClassification(_record) {
    throw new Error("ClassificationRepository.saveClassification must be implemented");
  }
}
