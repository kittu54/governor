import type { FastifyPluginAsync } from "fastify";
import { evaluateRequestSchema, simulateRequestSchema } from "@governor/shared";
import { PolicyService } from "./service";

export const evaluateRoutes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService({
    prisma: app.prisma,
    redis: app.redis,
    eventBus: app.eventBus,
  });

  app.post("/evaluate", async (request, reply) => {
    const payload = evaluateRequestSchema.parse(request.body);
    const result = await service.evaluate(payload);
    return reply.send(result);
  });

  app.post("/evaluate/simulate", async (request, reply) => {
    const payload = simulateRequestSchema.parse(request.body);
    const result = await service.evaluate(payload, { simulate: true });
    return reply.send(result);
  });

  app.post("/evaluate/explain", async (request, reply) => {
    const payload = evaluateRequestSchema.parse(request.body);
    const result = await service.evaluateExplain(payload);
    return reply.send(result);
  });
};
