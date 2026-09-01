import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const currentDir = dirname(fileURLToPath(import.meta.url));
const defaultDatabaseUrl = "postgresql://support:support@localhost:5432/support_ai_copilot";

config({
  path: resolve(currentDir, "../../.env")
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl
  }
});
