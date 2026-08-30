import { MockTicketClassifierProvider } from "./mock-ticket-classifier-provider.js";
import { OpenAiTicketClassifierProvider } from "./openai-ticket-classifier-provider.js";

export function createTicketClassifierProvider({
  providerName = "mock",
  openAiApiKey,
  openAiModel,
  fetchImpl
} = {}) {
  if (providerName === "mock") {
    return new MockTicketClassifierProvider();
  }

  if (providerName === "openai") {
    return new OpenAiTicketClassifierProvider({
      apiKey: openAiApiKey,
      model: openAiModel,
      fetchImpl
    });
  }

  throw new Error(`Unsupported ticket classifier provider: ${providerName}`);
}
