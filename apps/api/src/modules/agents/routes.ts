import type { FastifyPluginAsync } from "fastify";
import { createAgentSchema, updateAgentSchema } from "@governor/shared";

export const agentsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request) => {
    const query = request.query as { org_id?: string; status?: string; limit?: string };

    if (!query.org_id) {
      throw app.httpErrors.badRequest("org_id query parameter is required");
    }

    const limit = Math.min(Number(query.limit ?? 50), 200);

    const agents = await app.prisma.agent.findMany({
      where: {
        orgId: query.org_id,
        ...(query.status ? { status: query.status as "ACTIVE" | "INACTIVE" | "SUSPENDED" } : {})
      },
      include: {
        _count: {
          select: {
            runs: true,
            auditEvents: true,
            approvalRequests: { where: { status: "PENDING" } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return {
      agents: agents.map((a) => ({
        id: a.id,
        orgId: a.orgId,
        name: a.name,
        description: a.description,
        status: a.status,
        environment: a.environment,
        framework: a.framework,
        provider: a.provider,
        tags: a.tags,
        allowedTools: a.allowedTools,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        stats: {
          total_runs: a._count.runs,
          total_audit_events: a._count.auditEvents,
          pending_approvals: a._count.approvalRequests
        }
      }))
    };
  });

  app.get("/:agentId", async (request) => {
    const params = request.params as { agentId: string };
    const query = request.query as { org_id?: string };

    if (!query.org_id) {
      throw app.httpErrors.badRequest("org_id query parameter is required");
    }

    const agent = await app.prisma.agent.findFirst({
      where: { id: params.agentId, orgId: query.org_id },
      include: {
        _count: {
          select: {
            runs: true,
            auditEvents: true,
            approvalRequests: { where: { status: "PENDING" } }
          }
        }
      }
    });

    if (!agent) {
      throw app.httpErrors.notFound("Agent not found");
    }

    const [rules, thresholds, budgets, rateLimits, recentRuns] = await Promise.all([
      app.prisma.policyRule.findMany({
        where: {
          orgId: query.org_id,
          OR: [{ agentId: params.agentId }, { agentId: null }]
        },
        orderBy: { priority: "asc" }
      }),
      app.prisma.approvalThreshold.findMany({
        where: {
          orgId: query.org_id,
          OR: [{ agentId: params.agentId }, { agentId: null }]
        }
      }),
      app.prisma.budgetLimit.findMany({
        where: {
          orgId: query.org_id,
          OR: [{ agentId: params.agentId }, { agentId: null }]
        }
      }),
      app.prisma.rateLimitPolicy.findMany({
        where: {
          orgId: query.org_id,
          OR: [{ agentId: params.agentId }, { agentId: null }]
        }
      }),
      app.prisma.agentRun.findMany({
        where: { agentId: params.agentId, orgId: query.org_id },
        orderBy: { startedAt: "desc" },
        take: 20
      })
    ]);

    return {
      agent: {
        id: agent.id,
        orgId: agent.orgId,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        framework: agent.framework,
        tags: agent.tags,
        allowedTools: agent.allowedTools,
        metadata: agent.metadata,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
        stats: {
          total_runs: agent._count.runs,
          total_audit_events: agent._count.auditEvents,
          pending_approvals: agent._count.approvalRequests
        }
      },
      policies: { rules, thresholds, budgets, rateLimits },
      recentRuns: recentRuns.map((r) => ({
        id: r.id,
        status: r.status,
        source: r.source,
        provider: r.provider,
        model: r.model,
        taskName: r.taskName,
        startedAt: r.startedAt.toISOString(),
        durationMs: r.durationMs,
        totalCostUsd: r.totalCostUsd,
        totalToolCalls: r.totalToolCalls
      }))
    };
  });

  app.post("/", async (request, reply) => {
    const payload = createAgentSchema.parse(request.body);

    const existing = await app.prisma.agent.findUnique({ where: { id: payload.id } });
    if (existing) {
      throw app.httpErrors.conflict(`Agent with ID '${payload.id}' already exists`);
    }

    await app.prisma.organization.upsert({
      where: { id: payload.org_id },
      create: { id: payload.org_id, name: payload.org_id },
      update: {}
    });

    const agent = await app.prisma.agent.create({
      data: {
        id: payload.id,
        orgId: payload.org_id,
        name: payload.name,
        description: payload.description,
        status: payload.status,
        environment: payload.environment,
        framework: payload.framework,
        provider: payload.provider,
        tags: payload.tags ?? [],
        allowedTools: (payload.allowed_tools ?? []) as any,
        metadata: (payload.metadata ?? {}) as any
      }
    });

    await app.prisma.auditLog.create({
      data: {
        orgId: payload.org_id,
        actorType: "SYSTEM",
        eventType: "agent.created",
        entityType: "Agent",
        entityId: agent.id,
        summary: `Created agent "${payload.name}" (${payload.id})`
      }
    });

    return reply.code(201).send(agent);
  });

  app.patch("/:agentId", async (request) => {
    const params = request.params as { agentId: string };
    const query = request.query as { org_id?: string };
    const payload = updateAgentSchema.parse(request.body);

    if (!query.org_id) {
      throw app.httpErrors.badRequest("org_id query parameter is required");
    }

    const agent = await app.prisma.agent.findFirst({
      where: { id: params.agentId, orgId: query.org_id }
    });

    if (!agent) {
      throw app.httpErrors.notFound("Agent not found");
    }

    const updated = await app.prisma.agent.update({
      where: { id: params.agentId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.environment !== undefined ? { environment: payload.environment } : {}),
        ...(payload.framework !== undefined ? { framework: payload.framework } : {}),
        ...(payload.provider !== undefined ? { provider: payload.provider } : {}),
        ...(payload.tags !== undefined ? { tags: payload.tags ?? [] } : {}),
        ...(payload.allowed_tools !== undefined ? { allowedTools: (payload.allowed_tools ?? []) as any } : {}),
        ...(payload.metadata !== undefined ? { metadata: (payload.metadata ?? {}) as any } : {})
      }
    });

    return updated;
  });
};
