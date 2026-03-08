import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default("*"),
  SUPABASE_JWT_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
    throw new Error(`Invalid environment configuration. Missing or invalid: ${missing.join(", ")}`);
  }

  const config = parsed.data;

  if (config.NODE_ENV === "production") {
    if (config.CORS_ORIGIN === "*") {
      console.warn(
        "[governor] WARNING: CORS_ORIGIN is '*' in production. This is insecure; set an explicit allowlist."
      );
    }
    if (!config.SUPABASE_JWT_SECRET) {
      console.warn(
        "[governor] WARNING: SUPABASE_JWT_SECRET is not set in production. " +
        "Only API key auth will work — JWT auth will be unavailable."
      );
    }
  }

  return config;
}
