import { MockTicketClassifierProvider } from "./mock-ticket-classifier-provider.js";
import { OpenAiTicketClassifierProvider } from "./openai-ticket-classifier-provider.js";
import { GeminiTicketClassifierProvider } from "./gemini-ticket-classifier-provider.js";

export function createTicketClassifierProvider({
  providerName = "mock",
  openAiApiKey,
  openAiModel,
  geminiApiKey,
  geminiModel,
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

  if (providerName === "gemini") {
    return new GeminiTicketClassifierProvider({
      apiKey: geminiApiKey,
      model: geminiModel,
      fetchImpl
    });
  }

  throw new Error(`Unsupported ticket classifier provider: ${providerName}`);
}
