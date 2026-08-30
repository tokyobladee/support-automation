import { z } from "zod";

const webEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().trim().url().default("http://localhost:4000")
});

export function parseWebEnv(input) {
  return webEnvSchema.parse(input);
}

export const webEnv = parseWebEnv(process.env);
