import { PrismaPg } from "@prisma/adapter-pg";
export {
  FeedbackDraftNotFoundError,
  PrismaAgentFeedbackRepository,
  PrismaClassificationRepository,
  PrismaCopilotRepository,
  PrismaSupportContext,
  createPrismaSupportRepositories
} from "./prisma-support-repositories.js";

export async function createPrismaClient(options = {}) {
  const { connectionString = process.env.DATABASE_URL, ...clientOptions } = options;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create Prisma client");
  }

  const { PrismaClient } = await import("@prisma/client");
  const adapter = new PrismaPg({
    connectionString
  });

  return new PrismaClient({
    adapter,
    ...clientOptions
  });
}
