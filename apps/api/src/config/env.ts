import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("*"),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_JWT_ISSUER: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): EnvConfig {
  const config = envSchema.parse(source);

  // Production safety checks
  if (config.NODE_ENV === "production") {
    if (config.CORS_ORIGIN === "*") {
      throw new Error("CORS_ORIGIN=* is not allowed in production. Set an explicit allowlist.");
    }
    if (!config.CLERK_SECRET_KEY) {
      console.warn(
        "[governor] WARNING: CLERK_SECRET_KEY is not set in production. " +
        "Only API key auth will work — Clerk JWT auth will be unavailable."
      );
    }
  }

  return config;
}
