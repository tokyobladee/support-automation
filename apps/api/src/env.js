import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));

if (process.env.SUPPORT_LOAD_ENV_FILE !== "false") {
  config({ path: resolve(currentDir, "../../../.env"), quiet: true });
}

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  PERSISTENCE_PROVIDER: z.enum(["memory", "prisma"]).default("memory"),
  DEFAULT_ORGANIZATION_NAME: z.string().min(1).default("Default Support Organization"),
  DEFAULT_ORGANIZATION_SLUG: z.string().min(1).default("default-support"),
  DEFAULT_AGENT_EMAIL: z.string().email().default("agent@example.com"),
  DEFAULT_AGENT_NAME: z.string().min(1).default("Support Agent"),
  DEFAULT_AGENT_ROLE: z.enum(["agent", "lead", "admin"]).default("admin"),
  AUTH_MODE: z.enum(["disabled", "headers"]).default("disabled"),
  TRACING_PROVIDER: z.enum(["none", "opentelemetry"]).default("none"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_CLASSIFICATION_MODEL: z.string().min(1).default("gpt-5.6"),
  EMBEDDING_PROVIDER: z.enum(["hash", "openai"]).default("hash"),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
  OPENAI_EMBEDDING_DIMENSIONS: optionalPositiveInteger,
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://support:support@localhost:5432/support_ai_copilot"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().optional()
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.AUTH_MODE === "disabled") {
    context.addIssue({
      code: "custom",
      path: ["AUTH_MODE"],
      message: "AUTH_MODE must not be disabled in production"
    });
  }

  if (value.NODE_ENV !== "production") {
    return;
  }

  if (value.PERSISTENCE_PROVIDER !== "prisma") {
    context.addIssue({
      code: "custom",
      path: ["PERSISTENCE_PROVIDER"],
      message: "PERSISTENCE_PROVIDER must be prisma in production"
    });
  }

  if (value.AI_PROVIDER !== "openai") {
    context.addIssue({
      code: "custom",
      path: ["AI_PROVIDER"],
      message: "AI_PROVIDER must be openai in production"
    });
  }

  if (value.EMBEDDING_PROVIDER !== "openai") {
    context.addIssue({
      code: "custom",
      path: ["EMBEDDING_PROVIDER"],
      message: "EMBEDDING_PROVIDER must be openai in production"
    });
  }

  if (value.TRACING_PROVIDER !== "opentelemetry") {
    context.addIssue({
      code: "custom",
      path: ["TRACING_PROVIDER"],
      message: "TRACING_PROVIDER must be opentelemetry in production"
    });
  }

  if (!value.OPENAI_API_KEY) {
    context.addIssue({
      code: "custom",
      path: ["OPENAI_API_KEY"],
      message: "OPENAI_API_KEY is required in production"
    });
  }
});

export function parseEnv(input) {
  return envSchema.parse(input);
}

export const env = parseEnv(process.env);
