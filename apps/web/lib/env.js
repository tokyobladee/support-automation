import { z } from "zod";

const webEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().trim().url().default("http://localhost:4000"),
  NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true")
});

export function parseWebEnv(input) {
  return webEnvSchema.parse(input);
}

export const webEnv = parseWebEnv(process.env);
