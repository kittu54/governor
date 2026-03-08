import type { FastifyPluginAsync } from "fastify";
import {
  budgetSchema,
  evaluateRequestSchema,
  policyRuleSchema,
  rateLimitSchema,
  thresholdSchema
} from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth";
import { PolicyService } from "./service";

export const policyRoutes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService({
    prisma: app.prisma,
    redis: app.redis,
    eventBus: app.eventBus
  });

  app.get("/", async (request) => {
    const orgId = resolveRequestOrg(request);

    const [rules, thresholds, budgets, rateLimits] = await Promise.all([
      app.prisma.policyRule.findMany({ where: { orgId }, orderBy: { priority: "asc" } }),
      app.prisma.approvalThreshold.findMany({ where: { orgId } }),
      app.prisma.budgetLimit.findMany({ where: { orgId } }),
      app.prisma.rateLimitPolicy.findMany({ where: { orgId } })
    ]);

    return {
      rules,
      thresholds,
      budgets,
      rate_limits: rateLimits
    };
  });

  app.post("/rules", async (request, reply) => {
    const payload = policyRuleSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const rule = await app.prisma.policyRule.create({
      data: {
        orgId,
        agentId: payload.agent_id ?? null,
        toolName: payload.tool_name,
        toolAction: payload.tool_action,
        effect: payload.effect,
        priority: payload.priority,
        reason: payload.reason
      }
    });

    return reply.code(201).send(rule);
  });

  app.post("/thresholds", async (request, reply) => {
    const payload = thresholdSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const threshold = await app.prisma.approvalThreshold.create({
      data: {
        orgId,
        agentId: payload.agent_id ?? null,
        toolName: payload.tool_name,
        toolAction: payload.tool_action,
        amountUsd: payload.amount_usd
      }
    });

    return reply.code(201).send(threshold);
  });

  app.post("/budgets", async (request, reply) => {
    const payload = budgetSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const budget = await app.prisma.budgetLimit.create({
      data: {
        orgId,
        agentId: payload.agent_id ?? null,
        dailyLimitUsd: payload.daily_limit_usd
      }
    });

    return reply.code(201).send(budget);
  });

  app.post("/rate-limits", async (request, reply) => {
    const payload = rateLimitSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const rateLimit = await app.prisma.rateLimitPolicy.create({
      data: {
        orgId,
        agentId: payload.agent_id ?? null,
        callsPerMinute: payload.calls_per_minute
      }
    });

    return reply.code(201).send(rateLimit);
  });

  app.delete("/rules/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);
    const rule = await app.prisma.policyRule.findFirst({ where: { id, orgId } });
    if (!rule) throw app.httpErrors.notFound("Not found");
    await app.prisma.policyRule.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.delete("/thresholds/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);
    const threshold = await app.prisma.approvalThreshold.findFirst({ where: { id, orgId } });
    if (!threshold) throw app.httpErrors.notFound("Not found");
    await app.prisma.approvalThreshold.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.delete("/budgets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);
    const budget = await app.prisma.budgetLimit.findFirst({ where: { id, orgId } });
    if (!budget) throw app.httpErrors.notFound("Not found");
    await app.prisma.budgetLimit.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.delete("/rate-limits/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);
    const rateLimit = await app.prisma.rateLimitPolicy.findFirst({ where: { id, orgId } });
    if (!rateLimit) throw app.httpErrors.notFound("Not found");
    await app.prisma.rateLimitPolicy.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.post("/simulate", async (request) => {
    const payload = evaluateRequestSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    return service.evaluate({ ...payload, org_id: orgId } as import("@governor/shared").EvaluateRequest, { simulate: true });
  });
};
