import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import type { EnvConfig } from "../config/env.js";
import type { GovernorEventBus } from "../modules/events/bus.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    config: EnvConfig;
    eventBus: GovernorEventBus;
  }

  interface FastifyRequest {
    auth: {
      orgId?: string;
      userId?: string;
      apiKeyId?: string;
      orgRole?: string;
      authMethod?: "clerk" | "supabase" | "api_key" | "dev_header";
    };
  }
}
