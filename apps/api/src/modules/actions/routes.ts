import type { FastifyPluginAsync } from "fastify";
import { RISK_CLASS_META } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth.js";

export const actionsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const orgId = resolveRequestOrg(request);
    const {
      agent_id,
      risk_class,
      decision,
      tool_name,
      search,
      limit = "50",
      offset = "0",
      from,
      to,
    } = request.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = { orgId };
    if (agent_id) where.agentId = agent_id;
    if (risk_class) where.riskClass = risk_class;
    if (decision) where.decision = decision;
    if (tool_name) where.toolName = tool_name;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { toolName: { contains: search, mode: "insensitive" } },
        { toolAction: { contains: search, mode: "insensitive" } },
        { agentId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [evaluations, total] = await Promise.all([
      app.prisma.evaluation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(parseInt(limit), 200),
        skip: parseInt(offset),
        include: {
          agent: { select: { name: true, framework: true } },
          matchedPolicyVersion: { select: { id: true, versionNumber: true, policyId: true } },
        },
      }),
      app.prisma.evaluation.count({ where }),
    ]);

    const approvalIds = evaluations
      .filter((e) => e.decision === "REQUIRE_APPROVAL")
      .map((e) => e.id);

    const approvalsByEvalId: Record<string, { id: string; status: string }> = {};
    if (approvalIds.length > 0) {
      const approvals = await app.prisma.approvalRequest.findMany({
        where: { evaluationId: { in: approvalIds } },
        select: { id: true, evaluationId: true, status: true },
      });
      for (const a of approvals) {
        if (a.evaluationId) approvalsByEvalId[a.evaluationId] = { id: a.id, status: a.status };
      }
    }

    return reply.send({
      actions: evaluations.map((e) => ({
        id: e.id,
        timestamp: e.createdAt.toISOString(),
        org_id: e.orgId,
        agent_id: e.agentId,
        agent_name: e.agent.name,
        agent_framework: e.agent.framework,
        tool_name: e.toolName,
        tool_action: e.toolAction,
        risk_class: e.riskClass,
        risk_severity: RISK_CLASS_META[e.riskClass as keyof typeof RISK_CLASS_META]?.severity ?? 0,
        decision: e.decision,
        enforcement_mode: e.enforcementMode,
        cost_estimate_usd: e.costEstimateUsd ?? 0,
        duration_ms: e.durationMs,
        approval_status: approvalsByEvalId[e.id]?.status ?? null,
        approval_id: approvalsByEvalId[e.id]?.id ?? null,
        matched_policy_version_id: e.matchedPolicyVersionId,
        matched_rule_id: e.matchedRuleId,
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  });

  app.get("/:id", async (request, reply) => {
    const orgId = resolveRequestOrg(request);
    const { id } = request.params as { id: string };

    const evaluation = await app.prisma.evaluation.findFirst({
      where: { id, orgId },
      include: {
        agent: { select: { name: true, framework: true, provider: true, environment: true, tags: true, allowedTools: true } },
        matchedPolicyVersion: {
          select: { id: true, versionNumber: true, policyId: true, definitionJson: true, checksum: true, createdAt: true },
        },
      },
    });

    if (!evaluation) return reply.status(404).send({ error: "Action not found" });

    const [approval, auditEvent, run] = await Promise.all([
      app.prisma.approvalRequest.findFirst({
        where: { evaluationId: id },
        include: { actions: { orderBy: { createdAt: "asc" } } },
      }),
      app.prisma.auditEvent.findFirst({
        where: {
          orgId,
          agentId: evaluation.agentId,
          toolName: evaluation.toolName,
          toolAction: evaluation.toolAction,
          timestamp: {
            gte: new Date(evaluation.createdAt.getTime() - 1000),
            lte: new Date(evaluation.createdAt.getTime() + 1000),
          },
        },
      }),
      evaluation.runId
        ? app.prisma.agentRun.findUnique({ where: { id: evaluation.runId }, select: { id: true, status: true, taskName: true, startedAt: true } })
        : null,
    ]);

    return reply.send({
      id: evaluation.id,
      timestamp: evaluation.createdAt.toISOString(),
      org_id: evaluation.orgId,
      agent: {
        id: evaluation.agentId,
        name: evaluation.agent.name,
        framework: evaluation.agent.framework,
        provider: evaluation.agent.provider,
        environment: evaluation.agent.environment,
        tags: evaluation.agent.tags,
        allowed_tools: evaluation.agent.allowedTools,
      },
      tool_name: evaluation.toolName,
      tool_action: evaluation.toolAction,
      risk_class: evaluation.riskClass,
      risk_severity: RISK_CLASS_META[evaluation.riskClass as keyof typeof RISK_CLASS_META]?.severity ?? 0,
      decision: evaluation.decision,
      enforcement_mode: evaluation.enforcementMode,
      cost_estimate_usd: evaluation.costEstimateUsd ?? 0,
      duration_ms: evaluation.durationMs,
      trace: evaluation.traceJson,
      input_facts: evaluation.inputFactsJson,
      matched_policy_version: evaluation.matchedPolicyVersion
        ? {
            id: evaluation.matchedPolicyVersion.id,
            version_number: evaluation.matchedPolicyVersion.versionNumber,
            policy_id: evaluation.matchedPolicyVersion.policyId,
            checksum: evaluation.matchedPolicyVersion.checksum,
            created_at: evaluation.matchedPolicyVersion.createdAt.toISOString(),
          }
        : null,
      matched_rule_id: evaluation.matchedRuleId,
      approval: approval
        ? {
            id: approval.id,
            status: approval.status,
            reason: approval.reason,
            requested_at: approval.requestedAt.toISOString(),
            expires_at: approval.expiresAt?.toISOString() ?? null,
            decided_at: approval.decidedAt?.toISOString() ?? null,
            decided_by: approval.decidedBy,
            actions: approval.actions.map((a) => ({
              id: a.id,
              action: a.action,
              comment: a.comment,
              actor_user_id: a.actorUserId,
              created_at: a.createdAt.toISOString(),
            })),
          }
        : null,
      audit_event: auditEvent
        ? {
            id: auditEvent.id,
            status: auditEvent.status,
            latency_ms: auditEvent.latencyMs,
            input_summary: auditEvent.inputSummary,
            output_summary: auditEvent.outputSummary,
            error_message: auditEvent.errorMessage,
          }
        : null,
      linked_run: run
        ? {
            id: run.id,
            status: run.status,
            task_name: run.taskName,
            started_at: run.startedAt.toISOString(),
          }
        : null,
    });
  });

  app.get("/stats", async (request, reply) => {
    const orgId = resolveRequestOrg(request);
    const { period = "24h" } = request.query as { period?: string };

    const periodMap: Record<string, number> = {
      "1h": 3600000,
      "24h": 86400000,
      "7d": 604800000,
      "30d": 2592000000,
    };
    const sinceMs = periodMap[period] ?? 86400000;
    const since = new Date(Date.now() - sinceMs);

    const [total, byDecision, byRiskClass, byAgent] = await Promise.all([
      app.prisma.evaluation.count({
        where: { orgId, createdAt: { gte: since } },
      }),
      app.prisma.evaluation.groupBy({
        by: ["decision"],
        where: { orgId, createdAt: { gte: since } },
        _count: true,
      }),
      app.prisma.evaluation.groupBy({
        by: ["riskClass"],
        where: { orgId, createdAt: { gte: since } },
        _count: true,
      }),
      app.prisma.evaluation.groupBy({
        by: ["agentId"],
        where: { orgId, createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { agentId: "desc" } },
        take: 10,
      }),
    ]);

    return reply.send({
      period,
      total,
      by_decision: byDecision.map((d) => ({ decision: d.decision, count: d._count })),
      by_risk_class: byRiskClass.map((r) => ({ risk_class: r.riskClass, count: r._count })),
      by_agent: byAgent.map((a) => ({ agent_id: a.agentId, count: a._count })),
    });
  });
};
