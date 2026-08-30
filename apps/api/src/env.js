import { z } from "zod";

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
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
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
