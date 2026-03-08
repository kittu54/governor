import type { FastifyPluginAsync } from "fastify";
import { resolveRequestOrg } from "../../plugins/auth.js";

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/overview", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [events, pendingApprovals, runs] = await Promise.all([
      app.prisma.auditEvent.findMany({
        where: {
          orgId,
          timestamp: { gte: since }
        },
        orderBy: { timestamp: "asc" }
      }),
      app.prisma.approvalRequest.count({
        where: {
          orgId,
          status: "PENDING"
        }
      }),
      app.prisma.agentRun.findMany({
        where: {
          orgId,
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

  app.get("/agents", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { limit?: string };
    const limit = Math.min(Number(query.limit ?? 50), 100);

    const agents = await app.prisma.agent.findMany({
      where: { orgId },
      take: limit
    });

    return { agents };
  });

  app.get("/agents/:agentId", async (request) => {
    const orgId = resolveRequestOrg(request);
    const params = request.params as { agentId: string };
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [agent, events] = await Promise.all([
      app.prisma.agent.findFirst({
        where: {
          id: params.agentId,
          orgId
        }
      }),
      app.prisma.auditEvent.findMany({
        where: {
          orgId,
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
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const runs = await app.prisma.agentRun.findMany({
      where: {
        orgId,
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

  app.get("/frameworks", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [agents, audits, runs, apiKeys] = await Promise.all([
      app.prisma.agent.findMany({
        where: { orgId },
        select: { id: true, framework: true, status: true }
      }),
      app.prisma.auditEvent.findMany({
        where: {
          orgId,
          timestamp: { gte: since }
        },
        select: { agentId: true, decision: true, costEstimateUsd: true }
      }),
      app.prisma.agentRun.findMany({
        where: {
          orgId,
          startedAt: { gte: since }
        },
        select: { agentId: true, totalCostUsd: true, status: true }
      }),
      app.prisma.apiKey.findMany({
        where: { orgId, revokedAt: null },
        select: { framework: true, lastUsedAt: true }
      })
    ]);

    const agentFramework = new Map<string, string>();
    for (const a of agents) {
      agentFramework.set(a.id, a.framework ?? "unknown");
    }

    const frameworkMap = new Map<string, {
      agents: number;
      active_agents: number;
      tool_calls: number;
      runs: number;
      cost_usd: number;
      denied: number;
      allowed: number;
      approval_required: number;
      errors: number;
      api_keys: number;
    }>();

    function getOrCreate(fw: string) {
      if (!frameworkMap.has(fw)) {
        frameworkMap.set(fw, {
          agents: 0, active_agents: 0, tool_calls: 0, runs: 0,
          cost_usd: 0, denied: 0, allowed: 0, approval_required: 0, errors: 0, api_keys: 0
        });
      }
      return frameworkMap.get(fw)!;
    }

    for (const a of agents) {
      const fw = a.framework ?? "unknown";
      const entry = getOrCreate(fw);
      entry.agents += 1;
      if (a.status === "ACTIVE") entry.active_agents += 1;
    }

    for (const audit of audits) {
      const fw = agentFramework.get(audit.agentId) ?? "unknown";
      const entry = getOrCreate(fw);
      entry.tool_calls += 1;
      entry.cost_usd += audit.costEstimateUsd;
      if (audit.decision === "ALLOW") entry.allowed += 1;
      else if (audit.decision === "DENY") entry.denied += 1;
      else entry.approval_required += 1;
    }

    for (const run of runs) {
      const fw = agentFramework.get(run.agentId) ?? "unknown";
      const entry = getOrCreate(fw);
      entry.runs += 1;
      if (run.status === "ERROR") entry.errors += 1;
    }

    for (const key of apiKeys) {
      const fw = key.framework ?? "unknown";
      const entry = getOrCreate(fw);
      entry.api_keys += 1;
    }

    const frameworks = Array.from(frameworkMap.entries())
      .map(([framework, stats]) => ({
        framework,
        ...stats,
        cost_usd: Number(stats.cost_usd.toFixed(2)),
        block_rate: stats.tool_calls > 0 ? Number(((stats.denied / stats.tool_calls) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.tool_calls - a.tool_calls);

    return { frameworks };
  });

  // ─── Risk Class Metrics ────────────────────────────────────
  app.get("/risk-classes", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const evaluations = await app.prisma.evaluation.findMany({
      where: { orgId, createdAt: { gte: since } },
      select: { riskClass: true, decision: true, costEstimateUsd: true },
    });

    const map = new Map<string, { total: number; denied: number; allowed: number; approval: number; cost: number }>();

    for (const ev of evaluations) {
      const rc = ev.riskClass ?? "LOW_RISK";
      const entry = map.get(rc) ?? { total: 0, denied: 0, allowed: 0, approval: 0, cost: 0 };
      entry.total += 1;
      entry.cost += ev.costEstimateUsd ?? 0;
      if (ev.decision === "ALLOW") entry.allowed += 1;
      else if (ev.decision === "DENY") entry.denied += 1;
      else entry.approval += 1;
      map.set(rc, entry);
    }

    return {
      risk_classes: Array.from(map.entries())
        .map(([risk_class, stats]) => ({
          risk_class,
          ...stats,
          cost: Number(stats.cost.toFixed(2)),
          block_rate: stats.total > 0 ? Number(((stats.denied / stats.total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.total - a.total),
    };
  });

  // ─── Approval Metrics ──────────────────────────────────────
  app.get("/approvals", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const approvals = await app.prisma.approvalRequest.findMany({
      where: { orgId, requestedAt: { gte: since } },
      select: { status: true, toolName: true, riskClass: true, costEstimateUsd: true, requestedAt: true, decidedAt: true },
    });

    const statusCounts = { PENDING: 0, APPROVED: 0, DENIED: 0, EXPIRED: 0, CANCELED: 0 };
    let totalResolutionMs = 0;
    let resolvedCount = 0;
    let totalCost = 0;

    for (const a of approvals) {
      statusCounts[a.status as keyof typeof statusCounts] = (statusCounts[a.status as keyof typeof statusCounts] ?? 0) + 1;
      totalCost += a.costEstimateUsd;
      if (a.decidedAt) {
        totalResolutionMs += a.decidedAt.getTime() - a.requestedAt.getTime();
        resolvedCount += 1;
      }
    }

    return {
      total: approvals.length,
      status_breakdown: statusCounts,
      avg_resolution_seconds: resolvedCount > 0 ? Math.round(totalResolutionMs / resolvedCount / 1000) : null,
      total_cost_usd: Number(totalCost.toFixed(2)),
    };
  });

  // ─── Cost Metrics ──────────────────────────────────────────
  app.get("/costs", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 30), 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [evaluations, runs] = await Promise.all([
      app.prisma.evaluation.findMany({
        where: { orgId, createdAt: { gte: since } },
        select: { costEstimateUsd: true, decision: true, createdAt: true, agentId: true },
      }),
      app.prisma.agentRun.findMany({
        where: { orgId, startedAt: { gte: since } },
        select: { totalCostUsd: true, startedAt: true },
      }),
    ]);

    const dailyCosts = new Map<string, { governed_cost: number; blocked_cost: number; run_cost: number }>();

    for (const ev of evaluations) {
      const day = formatDay(ev.createdAt);
      const entry = dailyCosts.get(day) ?? { governed_cost: 0, blocked_cost: 0, run_cost: 0 };
      entry.governed_cost += ev.costEstimateUsd ?? 0;
      if (ev.decision === "DENY") entry.blocked_cost += ev.costEstimateUsd ?? 0;
      dailyCosts.set(day, entry);
    }

    for (const run of runs) {
      const day = formatDay(run.startedAt);
      const entry = dailyCosts.get(day) ?? { governed_cost: 0, blocked_cost: 0, run_cost: 0 };
      entry.run_cost += run.totalCostUsd;
      dailyCosts.set(day, entry);
    }

    const totalGoverned = evaluations.reduce((s, e) => s + (e.costEstimateUsd ?? 0), 0);
    const totalBlocked = evaluations.filter((e) => e.decision === "DENY").reduce((s, e) => s + (e.costEstimateUsd ?? 0), 0);
    const totalRunCost = runs.reduce((s, r) => s + r.totalCostUsd, 0);

    return {
      summary: {
        total_governed_cost_usd: Number(totalGoverned.toFixed(2)),
        total_blocked_cost_usd: Number(totalBlocked.toFixed(2)),
        total_run_cost_usd: Number(totalRunCost.toFixed(4)),
      },
      daily: Array.from(dailyCosts.entries())
        .map(([date, costs]) => ({
          date,
          governed_cost: Number(costs.governed_cost.toFixed(2)),
          blocked_cost: Number(costs.blocked_cost.toFixed(2)),
          run_cost: Number(costs.run_cost.toFixed(4)),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  });

  // ─── Governance Summary ────────────────────────────────────
  app.get("/governance", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [evaluations, approvals, agents] = await Promise.all([
      app.prisma.evaluation.findMany({
        where: { orgId, createdAt: { gte: since } },
        select: {
          decision: true,
          riskClass: true,
          costEstimateUsd: true,
          agentId: true,
          toolName: true,
          toolAction: true,
          createdAt: true,
        },
      }),
      app.prisma.approvalRequest.findMany({
        where: { orgId, requestedAt: { gte: since } },
        select: { status: true, costEstimateUsd: true },
      }),
      app.prisma.agent.findMany({
        where: { orgId },
        select: { id: true, status: true },
      }),
    ]);

    const totalEvals = evaluations.length;
    const blocked = evaluations.filter((e) => e.decision === "DENY").length;
    const allowed = evaluations.filter((e) => e.decision === "ALLOW").length;
    const requireApproval = evaluations.filter((e) => e.decision === "REQUIRE_APPROVAL").length;
    const totalCost = evaluations.reduce((s, e) => s + (e.costEstimateUsd ?? 0), 0);
    const blockedCost = evaluations.filter((e) => e.decision === "DENY").reduce((s, e) => s + (e.costEstimateUsd ?? 0), 0);

    const agentDenials = new Map<string, number>();
    for (const ev of evaluations) {
      if (ev.decision === "DENY") {
        agentDenials.set(ev.agentId, (agentDenials.get(ev.agentId) ?? 0) + 1);
      }
    }
    const topDeniedAgents = Array.from(agentDenials.entries())
      .map(([agent_id, denials]) => ({ agent_id, denials }))
      .sort((a, b) => b.denials - a.denials)
      .slice(0, 10);

    const dailyMap = new Map<string, { total: number; blocked: number; allowed: number }>();
    for (const ev of evaluations) {
      const day = formatDay(ev.createdAt);
      const entry = dailyMap.get(day) ?? { total: 0, blocked: 0, allowed: 0 };
      entry.total += 1;
      if (ev.decision === "DENY") entry.blocked += 1;
      else if (ev.decision === "ALLOW") entry.allowed += 1;
      dailyMap.set(day, entry);
    }

    return {
      summary: {
        total_evaluations: totalEvals,
        allowed,
        blocked,
        require_approval: requireApproval,
        block_rate: totalEvals > 0 ? Number(((blocked / totalEvals) * 100).toFixed(1)) : 0,
        total_cost_governed_usd: Number(totalCost.toFixed(2)),
        spend_prevented_usd: Number(blockedCost.toFixed(2)),
        approval_rate: approvals.length > 0
          ? Number(((approvals.filter((a) => a.status === "APPROVED").length / approvals.length) * 100).toFixed(1))
          : 0,
        active_agents: agents.filter((a) => a.status === "ACTIVE").length,
      },
      top_denied_agents: topDeniedAgents,
      daily: Array.from(dailyMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  });

  // ─── Tool-Level Metrics ────────────────────────────────────
  app.get("/tools", async (request) => {
    const orgId = resolveRequestOrg(request);
    const query = request.query as { days?: string; limit?: string };
    const days = Math.min(Math.max(Number(query.days ?? 7), 1), 60);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const limit = Math.min(Number(query.limit ?? 20), 100);

    const evaluations = await app.prisma.evaluation.findMany({
      where: { orgId, createdAt: { gte: since } },
      select: { toolName: true, toolAction: true, riskClass: true, decision: true, costEstimateUsd: true },
    });

    const toolMap = new Map<string, {
      tool_name: string;
      tool_action: string;
      risk_class: string | null;
      total: number;
      denied: number;
      allowed: number;
      cost: number;
    }>();

    for (const ev of evaluations) {
      const key = `${ev.toolName}.${ev.toolAction}`;
      const entry = toolMap.get(key) ?? {
        tool_name: ev.toolName,
        tool_action: ev.toolAction,
        risk_class: ev.riskClass,
        total: 0,
        denied: 0,
        allowed: 0,
        cost: 0,
      };
      entry.total += 1;
      entry.cost += ev.costEstimateUsd ?? 0;
      if (ev.decision === "DENY") entry.denied += 1;
      else if (ev.decision === "ALLOW") entry.allowed += 1;
      toolMap.set(key, entry);
    }

    const tools = Array.from(toolMap.values())
      .map((t) => ({
        ...t,
        cost: Number(t.cost.toFixed(2)),
        block_rate: t.total > 0 ? Number(((t.denied / t.total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.denied - a.denied)
      .slice(0, limit);

    return { tools };
  });
};
