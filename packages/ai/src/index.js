export class AiProvider {
  async classifyTicket(_request) {
    throw new Error("AiProvider.classifyTicket must be implemented");
  }

  async generateReplyVariants(_request) {
    throw new Error("AiProvider.generateReplyVariants must be implemented");
  }
}
