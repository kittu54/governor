import type { FastifyPluginAsync } from "fastify";
import { evaluateRequestSchema } from "@governor/shared";
import { PolicyService } from "./service";

export const evaluateRoutes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService({
    prisma: app.prisma,
    redis: app.redis,
    eventBus: app.eventBus
  });

  app.post("/evaluate", async (request, reply) => {
    const payload = evaluateRequestSchema.parse(request.body);
    const result = await service.evaluate(payload);
    return reply.send(result);
  });
};
