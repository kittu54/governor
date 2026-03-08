import type { FastifyPluginAsync } from "fastify";
import { approvalDecisionSchema, approvalActionSchema } from "@governor/shared";

export const approvalsRoutes: FastifyPluginAsync = async (app) => {
  // ─── List Approvals ────────────────────────────────────────
  app.get("/", async (request) => {
    const query = request.query as {
      org_id?: string;
      status?: string;
      risk_class?: string;
      agent_id?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(Number(query.limit ?? 50), 500);
    const offset = Number(query.offset ?? 0);

    const where: Record<string, unknown> = {};
    if (query.org_id) where.orgId = query.org_id;
    if (query.status) where.status = query.status;
    if (query.risk_class) where.riskClass = query.risk_class;
    if (query.agent_id) where.agentId = query.agent_id;

    const [approvals, total] = await Promise.all([
      app.prisma.approvalRequest.findMany({
        where,
        include: {
          actions: { orderBy: { createdAt: "desc" } },
          agent: { select: { name: true, framework: true } },
        },
        orderBy: { requestedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      app.prisma.approvalRequest.count({ where }),
    ]);

    return {
      approvals: approvals.map((a) => ({
        id: a.id,
        org_id: a.orgId,
        agent_id: a.agentId,
        agent_name: a.agent?.name,
        agent_framework: a.agent?.framework,
        run_id: a.runId,
        evaluation_id: a.evaluationId,
        tool_name: a.toolName,
        tool_action: a.toolAction,
        risk_class: a.riskClass,
        cost_estimate_usd: a.costEstimateUsd,
        status: a.status,
        reason: a.reason,
        evidence: a.evidenceJson,
        requested_at: a.requestedAt.toISOString(),
        expires_at: a.expiresAt?.toISOString() ?? null,
        decided_at: a.decidedAt?.toISOString() ?? null,
        decided_by: a.decidedBy,
        is_expired: a.expiresAt ? a.expiresAt < new Date() && a.status === "PENDING" : false,
        sla_remaining_seconds: a.expiresAt && a.status === "PENDING"
          ? Math.max(0, Math.floor((a.expiresAt.getTime() - Date.now()) / 1000))
          : null,
        actions: a.actions.map((act) => ({
          id: act.id,
          action: act.action,
          actor_user_id: act.actorUserId,
          comment: act.comment,
          created_at: act.createdAt.toISOString(),
        })),
      })),
      total,
      limit,
      offset,
    };
  });

  // ─── Get Approval Detail ───────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const approval = await app.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        actions: { orderBy: { createdAt: "asc" } },
        agent: { select: { name: true, framework: true, status: true } },
      },
    });

    if (!approval) return reply.status(404).send({ error: "Approval not found" });

    return reply.send({
      id: approval.id,
      org_id: approval.orgId,
      agent_id: approval.agentId,
      agent_name: approval.agent?.name,
      run_id: approval.runId,
      evaluation_id: approval.evaluationId,
      tool_name: approval.toolName,
      tool_action: approval.toolAction,
      risk_class: approval.riskClass,
      cost_estimate_usd: approval.costEstimateUsd,
      status: approval.status,
      reason: approval.reason,
      evidence: approval.evidenceJson,
      trace: approval.trace,
      requested_at: approval.requestedAt.toISOString(),
      expires_at: approval.expiresAt?.toISOString() ?? null,
      decided_at: approval.decidedAt?.toISOString() ?? null,
      decided_by: approval.decidedBy,
      actions: approval.actions.map((act) => ({
        id: act.id,
        action: act.action,
        actor_user_id: act.actorUserId,
        comment: act.comment,
        created_at: act.createdAt.toISOString(),
      })),
    });
  });

  // ─── Legacy: single decision endpoint ──────────────────────
  app.post("/decision", async (request, reply) => {
    const payload = approvalDecisionSchema.parse(request.body);

    const existing = await app.prisma.approvalRequest.findUnique({
      where: { id: payload.approval_id },
    });

    if (!existing) throw app.httpErrors.notFound("Approval request not found");
    if (existing.status !== "PENDING") throw app.httpErrors.conflict("Approval request already decided");

    const status = payload.action === "APPROVE" ? "APPROVED" : "DENIED";

    const [approval] = await app.prisma.$transaction([
      app.prisma.approvalRequest.update({
        where: { id: payload.approval_id },
        data: { status, decidedAt: new Date(), decidedBy: payload.decided_by },
      }),
      app.prisma.approvalAction.create({
        data: {
          approvalRequestId: payload.approval_id,
          actorUserId: payload.decided_by,
          action: payload.action,
          comment: payload.comment ?? payload.reason,
        },
      }),
      app.prisma.auditLog.create({
        data: {
          orgId: existing.orgId,
          actorType: "USER",
          actorId: payload.decided_by,
          eventType: `approval.${payload.action.toLowerCase()}`,
          entityType: "ApprovalRequest",
          entityId: payload.approval_id,
          summary: `${payload.action} approval for ${existing.toolName}.${existing.toolAction}`,
        },
      }),
    ]);

    await app.prisma.auditEvent.updateMany({
      where: {
        orgId: approval.orgId,
        agentId: approval.agentId,
        sessionId: approval.sessionId,
        toolName: approval.toolName,
        toolAction: approval.toolAction,
        status: "REQUIRES_APPROVAL",
      },
      data: { status: status === "APPROVED" ? "PENDING" : "DENIED" },
    });

    app.eventBus.publish({
      type: "approval.updated",
      org_id: approval.orgId,
      payload: {
        id: approval.id,
        status: approval.status,
        decided_at: approval.decidedAt,
        decided_by: approval.decidedBy,
      },
    });

    return { approval };
  });

  // ─── Approve ───────────────────────────────────────────────
  app.post("/:id/approve", async (request, reply) => {
    return handleAction(app, request.params as { id: string }, request.body, "APPROVE", reply);
  });

  // ─── Deny ─────────────────────────────────────────────────
  app.post("/:id/deny", async (request, reply) => {
    return handleAction(app, request.params as { id: string }, request.body, "DENY", reply);
  });

  // ─── Escalate ──────────────────────────────────────────────
  app.post("/:id/escalate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = approvalActionSchema.parse(request.body);

    const existing = await app.prisma.approvalRequest.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: "Approval not found" });
    if (existing.status !== "PENDING") return reply.status(409).send({ error: "Already decided" });

    const action = await app.prisma.approvalAction.create({
      data: {
        approvalRequestId: id,
        actorUserId: body.actor_user_id,
        action: "ESCALATE",
        comment: body.comment,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId: existing.orgId,
        actorType: "USER",
        actorId: body.actor_user_id,
        eventType: "approval.escalated",
        entityType: "ApprovalRequest",
        entityId: id,
        summary: `Escalated approval for ${existing.toolName}.${existing.toolAction}`,
      },
    });

    app.eventBus.publish({
      type: "approval.updated",
      org_id: existing.orgId,
      payload: { id, status: "PENDING", action: "ESCALATE" },
    });

    return reply.send({ action_id: action.id, escalated: true });
  });

  // ─── Comment ───────────────────────────────────────────────
  app.post("/:id/comment", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = approvalActionSchema.parse(request.body);

    const existing = await app.prisma.approvalRequest.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: "Approval not found" });

    const action = await app.prisma.approvalAction.create({
      data: {
        approvalRequestId: id,
        actorUserId: body.actor_user_id,
        action: "COMMENT",
        comment: body.comment,
      },
    });

    return reply.send({ action_id: action.id });
  });
};

async function handleAction(
  app: { prisma: import("@prisma/client").PrismaClient; httpErrors: any; eventBus: any },
  params: { id: string },
  body: unknown,
  actionType: "APPROVE" | "DENY",
  reply: import("fastify").FastifyReply
) {
  const { id } = params;
  const parsed = approvalActionSchema.parse(body);

  const existing = await app.prisma.approvalRequest.findUnique({ where: { id } });
  if (!existing) return reply.status(404).send({ error: "Approval not found" });
  if (existing.status !== "PENDING") return reply.status(409).send({ error: "Already decided" });

  const status = actionType === "APPROVE" ? "APPROVED" : "DENIED";

  const [approval] = await app.prisma.$transaction([
    app.prisma.approvalRequest.update({
      where: { id },
      data: { status: status as any, decidedAt: new Date(), decidedBy: parsed.actor_user_id },
    }),
    app.prisma.approvalAction.create({
      data: {
        approvalRequestId: id,
        actorUserId: parsed.actor_user_id,
        action: actionType,
        comment: parsed.comment,
      },
    }),
    app.prisma.auditLog.create({
      data: {
        orgId: existing.orgId,
        actorType: "USER",
        actorId: parsed.actor_user_id,
        eventType: `approval.${actionType.toLowerCase()}`,
        entityType: "ApprovalRequest",
        entityId: id,
        summary: `${actionType} approval for ${existing.toolName}.${existing.toolAction}`,
      },
    }),
  ]);

  await app.prisma.auditEvent.updateMany({
    where: {
      orgId: approval.orgId,
      agentId: approval.agentId,
      toolName: approval.toolName,
      toolAction: approval.toolAction,
      status: "REQUIRES_APPROVAL",
    },
    data: { status: status === "APPROVED" ? "PENDING" : "DENIED" },
  });

  app.eventBus.publish({
    type: "approval.updated",
    org_id: approval.orgId,
    payload: { id, status, decided_by: parsed.actor_user_id },
  });

  return reply.send({
    id: approval.id,
    status: approval.status,
    decided_at: approval.decidedAt?.toISOString(),
    decided_by: approval.decidedBy,
  });
}
