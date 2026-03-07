import type { FastifyPluginAsync } from "fastify";
import {
  budgetSchema,
  evaluateRequestSchema,
  policyRuleSchema,
  rateLimitSchema,
  thresholdSchema
} from "@governor/shared";
import { PolicyService } from "./service";

export const policyRoutes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService({
    prisma: app.prisma,
    redis: app.redis,
    eventBus: app.eventBus
  });

  app.get("/", async (request) => {
    const query = request.query as { org_id?: string };
    const orgId = query.org_id ?? request.auth.orgId;

    if (!orgId) {
      throw app.httpErrors.badRequest("org_id is required");
    }

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
    const rule = await app.prisma.policyRule.create({
      data: {
        orgId: payload.org_id,
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
    const threshold = await app.prisma.approvalThreshold.create({
      data: {
        orgId: payload.org_id,
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
    const budget = await app.prisma.budgetLimit.create({
      data: {
        orgId: payload.org_id,
        agentId: payload.agent_id ?? null,
        dailyLimitUsd: payload.daily_limit_usd
      }
    });

    return reply.code(201).send(budget);
  });

  app.post("/rate-limits", async (request, reply) => {
    const payload = rateLimitSchema.parse(request.body);
    const rateLimit = await app.prisma.rateLimitPolicy.create({
      data: {
        orgId: payload.org_id,
        agentId: payload.agent_id ?? null,
        callsPerMinute: payload.calls_per_minute
      }
    });

    return reply.code(201).send(rateLimit);
  });

  app.post("/simulate", async (request) => {
    const payload = evaluateRequestSchema.parse(request.body);
    return service.evaluate(payload, { simulate: true });
  });
};
