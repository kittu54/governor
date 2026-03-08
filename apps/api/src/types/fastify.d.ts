import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import type { EnvConfig } from "../config/env";
import type { GovernorEventBus } from "../modules/events/bus";

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
      authMethod?: "clerk" | "api_key" | "dev_header";
    };
  }
}
