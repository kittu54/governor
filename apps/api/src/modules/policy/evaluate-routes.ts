import type { FastifyPluginAsync } from "fastify";
import { evaluateRequestSchema, simulateRequestSchema } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth";
import { PolicyService } from "./service";

export const evaluateRoutes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService({
    prisma: app.prisma,
    redis: app.redis,
    eventBus: app.eventBus,
  });

  app.post("/evaluate", async (request, reply) => {
    const payload = evaluateRequestSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const result = await service.evaluate({ ...payload, org_id: orgId } as import("@governor/shared").EvaluateRequest);
    return reply.send(result);
  });

  app.post("/evaluate/simulate", async (request, reply) => {
    const payload = simulateRequestSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const result = await service.evaluate({ ...payload, org_id: orgId } as import("@governor/shared").EvaluateRequest, { simulate: true });
    return reply.send(result);
  });

  app.post("/evaluate/explain", async (request, reply) => {
    const payload = evaluateRequestSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const result = await service.evaluateExplain({ ...payload, org_id: orgId } as import("@governor/shared").EvaluateRequest);
    return reply.send(result);
  });
};
