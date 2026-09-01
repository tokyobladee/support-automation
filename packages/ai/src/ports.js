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

export class CopilotRepository {
  async saveCopilotDraft(_record) {
    throw new Error("CopilotRepository.saveCopilotDraft must be implemented");
  }
}

export class AgentFeedbackRepository {
  async saveFeedback(_record) {
    throw new Error("AgentFeedbackRepository.saveFeedback must be implemented");
  }

  async listFeedback() {
    throw new Error("AgentFeedbackRepository.listFeedback must be implemented");
  }
}
