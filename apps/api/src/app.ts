import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import { ZodError } from "zod";
import { loadEnv, type EnvConfig } from "./config/env";
import { createPrismaClient } from "./lib/prisma";
import { createRedisClient } from "./lib/redis";
import { authPlugin } from "./plugins/auth";
import { v1Routes } from "./routes/v1";
import { createEventBus, GovernorEventBus } from "./modules/events/bus";

export interface AppDependencies {
  prisma: PrismaClient;
  redis: Redis;
  config: EnvConfig;
  eventBus: GovernorEventBus;
}

export async function buildApp(overrides?: Partial<AppDependencies>) {
  const config = overrides?.config ?? loadEnv();

  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "development" ? "info" : "warn"
    }
  });

  const prisma = overrides?.prisma ?? createPrismaClient();
  const redis = overrides?.redis ?? createRedisClient(config.REDIS_URL);
  const eventBus = overrides?.eventBus ?? createEventBus();

  app.decorate("prisma", prisma);
  app.decorate("redis", redis);
  app.decorate("config", config);
  app.decorate("eventBus", eventBus);

  await app.register(sensible);
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true
  });
  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  await app.register(authPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Validation Error",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const statusCode = (error as any).statusCode ?? 500;
    reply.status(statusCode).send({
      error: (error as Error).message ?? "Internal Server Error"
    });
  });

  app.get("/health", async () => ({ ok: true, timestamp: new Date().toISOString() }));
  await app.register(v1Routes, { prefix: "/v1" });

  app.addHook("onClose", async () => {
    if (!overrides?.prisma) {
      await prisma.$disconnect();
    }
    if (!overrides?.redis) {
      await redis.quit();
    }
  });

  return app;
}
