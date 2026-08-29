import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function createPrismaClient(options = {}) {
  const { connectionString = process.env.DATABASE_URL, ...clientOptions } = options;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create Prisma client");
  }

  const adapter = new PrismaPg({
    connectionString
  });

  return new PrismaClient({
    adapter,
    ...clientOptions
  });
}
