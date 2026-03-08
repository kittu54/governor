import type { IncomingMessage, ServerResponse } from "node:http";

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { ZodError } from "zod";
import type { FastifyInstance } from "fastify";
import { loadEnv, type EnvConfig } from "./config/env.js";
import { createPrismaClient } from "./lib/prisma.js";
import { createRedisClient, NullRedis } from "./lib/redis.js";
import { authPlugin } from "./plugins/auth.js";
import { v1Routes } from "./routes/v1.js";
import { createEventBus, GovernorEventBus } from "./modules/events/bus.js";

export interface AppDependencies {
  prisma: PrismaClient;
  redis: Redis;
  config: EnvConfig;
  eventBus: GovernorEventBus;
}

function resolveCorsOrigin(config: EnvConfig): string | string[] | boolean {
  if (config.NODE_ENV === "production") {
    if (config.CORS_ORIGIN === "*") {
      throw new Error(
        "CORS_ORIGIN=* is not allowed in production. Set an explicit allowlist (comma-separated origins)."
      );
    }
    return config.CORS_ORIGIN.split(",").map((o) => o.trim());
  }
  if (config.CORS_ORIGIN === "*") return true;
  return config.CORS_ORIGIN.split(",").map((o) => o.trim());
}

export async function buildApp(overrides?: Partial<AppDependencies>) {
  const config = overrides?.config ?? loadEnv();

  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  const prisma = overrides?.prisma ?? createPrismaClient();
  const redis = overrides?.redis ?? (config.REDIS_URL ? createRedisClient(config.REDIS_URL) : new NullRedis() as any);
  const eventBus = overrides?.eventBus ?? createEventBus();

  app.decorate("prisma", prisma);
  app.decorate("redis", redis);
  app.decorate("config", config);
  app.decorate("eventBus", eventBus);

  await app.register(sensible);
  await app.register(cors, {
    origin: resolveCorsOrigin(config),
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(authPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Validation Error",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const statusCode = (error as any).statusCode ?? 500;
    reply.status(statusCode).send({
      error: (error as Error).message ?? "Internal Server Error",
    });
  });

  app.get("/health", async () => ({ ok: true, timestamp: new Date().toISOString() }));

  app.get("/ready", async (_request, reply) => {
    const checks: Record<string, boolean> = {};
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }
    if (config.REDIS_URL) {
      try {
        const pong = await redis.ping();
        checks.redis = pong === "PONG";
      } catch {
        checks.redis = false;
      }
    } else {
      checks.redis = true; // in-memory stub, always healthy
    }
    const ok = checks.database && checks.redis;
    return reply.status(ok ? 200 : 503).send({ ok, checks, timestamp: new Date().toISOString() });
  });

  await app.register(v1Routes, { prefix: "/v1" });

  app.addHook("onClose", async () => {
    if (!overrides?.prisma) {
      await prisma.$disconnect();
    }
    if (!overrides?.redis && config.REDIS_URL) {
      await redis.quit();
    }
  });

  return app;
}

let cachedApp: Promise<FastifyInstance> | null = null;

async function getServerlessApp(): Promise<FastifyInstance> {
  if (!cachedApp) {
    cachedApp = buildApp();
  }

  const app = await cachedApp;
  await app.ready();
  return app;
}

/**
 * Vercel Node.js Serverless entrypoint.
 * Vercel expects the default export from this module to be a request handler.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getServerlessApp();
    app.server.emit("request", req, res);
  } catch (error) {
    console.error("[governor-api] Serverless handler bootstrap failed", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
    }
    res.end(JSON.stringify({ error: "Server bootstrap failure" }));
  }
}
