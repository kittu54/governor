import type { FastifyPluginAsync } from "fastify";

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/overview", async (request) => {
    const query = request.query as { org_id?: string; days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [events, pendingApprovals, runs] = await Promise.all([
      app.prisma.auditEvent.findMany({
        where: {
          orgId: query.org_id,
          timestamp: { gte: since }
        },
        orderBy: { timestamp: "asc" }
      }),
      app.prisma.approvalRequest.count({
        where: {
          orgId: query.org_id,
          status: "PENDING"
        }
      }),
      app.prisma.agentRun.findMany({
        where: {
          orgId: query.org_id,
          startedAt: { gte: since }
        }
      })
    ]);

    const totalCalls = events.length;
    const blocked = events.filter((event) => event.decision === "DENY").length;
    const blockedPct = totalCalls === 0 ? 0 : (blocked / totalCalls) * 100;
    const estimatedCost = events.reduce((sum, event) => sum + event.costEstimateUsd, 0);

    const seriesMap = new Map<string, { calls: number; cost: number }>();
    for (const event of events) {
      const key = formatDay(event.timestamp);
      const current = seriesMap.get(key) ?? { calls: 0, cost: 0 };
      current.calls += 1;
      current.cost += event.costEstimateUsd;
      seriesMap.set(key, current);
    }

    const callsSeries = Array.from(seriesMap.entries()).map(([date, value]) => ({
      date,
      calls: value.calls,
      cost: Number(value.cost.toFixed(2))
    }));

    const decisionBreakdown = ["ALLOW", "DENY", "REQUIRE_APPROVAL"].map((decision) => ({
      decision,
      value: events.filter((event) => event.decision === decision).length
    }));

    const providerBreakdown = Array.from(
      runs.reduce<Map<string, { runs: number; cost: number; errors: number }>>((map, run) => {
        const key = run.provider ?? run.source;
        const current = map.get(key) ?? { runs: 0, cost: 0, errors: 0 };
        current.runs += 1;
        current.cost += run.totalCostUsd;
        if (run.status === "ERROR") {
          current.errors += 1;
        }
        map.set(key, current);
        return map;
      }, new Map())
    ).map(([provider, value]) => ({
      provider,
      runs: value.runs,
      estimated_cost_usd: Number(value.cost.toFixed(4)),
      error_rate: value.runs === 0 ? 0 : Number(((value.errors / value.runs) * 100).toFixed(2))
    }));

    return {
      kpis: {
        tool_calls: totalCalls,
        blocked_pct: Number(blockedPct.toFixed(2)),
        pending_approvals: pendingApprovals,
        estimated_cost_usd: Number(estimatedCost.toFixed(2)),
        run_count: runs.length,
        run_cost_usd: Number(runs.reduce((sum, run) => sum + run.totalCostUsd, 0).toFixed(4))
      },
      calls_series: callsSeries,
      decision_breakdown: decisionBreakdown,
      provider_breakdown: providerBreakdown
    };
  });

  app.get("/tenants", async () => {
    const [orgs, events, approvals] = await Promise.all([
      app.prisma.organization.findMany(),
      app.prisma.auditEvent.findMany(),
      app.prisma.approvalRequest.findMany({ where: { status: "PENDING" } })
    ]);

    const metrics = orgs.map((org) => {
      const orgEvents = events.filter((event) => event.orgId === org.id);
      const totalCalls = orgEvents.length;
      const cost = orgEvents.reduce((sum, event) => sum + event.costEstimateUsd, 0);
      const blocked = orgEvents.filter((event) => event.decision === "DENY").length;

      return {
        org_id: org.id,
        org_name: org.name,
        tool_calls: totalCalls,
        estimated_cost_usd: Number(cost.toFixed(2)),
        blocked_pct: totalCalls === 0 ? 0 : Number(((blocked / totalCalls) * 100).toFixed(2)),
        pending_approvals: approvals.filter((item) => item.orgId === org.id).length
      };
    });

    return { tenants: metrics };
  });

  app.get("/agents", async (request) => {
    const query = request.query as { org_id?: string; limit?: string };
    const limit = Math.min(Number(query.limit ?? 50), 100);

    const agents = await app.prisma.agent.findMany({
      where: { orgId: query.org_id },
      take: limit
    });

    return { agents };
  });

  app.get("/agents/:agentId", async (request) => {
    const params = request.params as { agentId: string };
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [agent, events] = await Promise.all([
      app.prisma.agent.findUnique({ where: { id: params.agentId } }),
      app.prisma.auditEvent.findMany({
        where: {
          agentId: params.agentId,
          timestamp: { gte: since }
        },
        orderBy: { timestamp: "desc" }
      })
    ]);

    if (!agent) {
      throw app.httpErrors.notFound("Agent not found");
    }

    const total = events.length;
    const errors = events.filter((event) => event.status === "ERROR").length;
    const blocked = events.filter((event) => event.decision === "DENY").length;

    const toolsUsedMap = new Map<string, number>();
    for (const event of events) {
      const key = `${event.toolName}.${event.toolAction}`;
      toolsUsedMap.set(key, (toolsUsedMap.get(key) ?? 0) + 1);
    }

    const toolsUsed = Array.from(toolsUsedMap.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      agent: {
        id: agent.id,
        org_id: agent.orgId,
        name: agent.name,
        tool_calls: total,
        error_rate: total === 0 ? 0 : Number(((errors / total) * 100).toFixed(2)),
        blocked_actions: blocked,
        tools_used: toolsUsed
      },
      recent_events: events.slice(0, 50)
    };
  });

  app.get("/provider-breakdown", async (request) => {
    const query = request.query as { org_id?: string; days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const runs = await app.prisma.agentRun.findMany({
      where: {
        orgId: query.org_id,
        startedAt: { gte: since }
      }
    });

    const rows = Array.from(
      runs.reduce<Map<string, { runs: number; cost: number; inputTokens: number; outputTokens: number; errors: number }>>(
        (map, run) => {
          const key = `${run.source}:${run.provider ?? "unknown"}`;
          const current = map.get(key) ?? { runs: 0, cost: 0, inputTokens: 0, outputTokens: 0, errors: 0 };
          current.runs += 1;
          current.cost += run.totalCostUsd;
          current.inputTokens += run.totalInputTokens;
          current.outputTokens += run.totalOutputTokens;
          if (run.status === "ERROR") {
            current.errors += 1;
          }
          map.set(key, current);
          return map;
        },
        new Map()
      )
    ).map(([key, value]) => {
      const [source, provider] = key.split(":");
      return {
        source,
        provider,
        runs: value.runs,
        estimated_cost_usd: Number(value.cost.toFixed(4)),
        input_tokens: value.inputTokens,
        output_tokens: value.outputTokens,
        error_rate: value.runs === 0 ? 0 : Number(((value.errors / value.runs) * 100).toFixed(2))
      };
    });

    return { providers: rows };
  });
};
