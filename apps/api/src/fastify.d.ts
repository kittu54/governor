import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import type { EnvConfig } from "./config/env";
import type { GovernorEventBus } from "./modules/events/bus";

declare module "fastify" {
  interface FastifyRequest {
    auth: {
      userId?: string;
      orgId?: string;
    };
  }

  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    config: EnvConfig;
    eventBus: GovernorEventBus;
  }
}
