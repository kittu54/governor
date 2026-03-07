import type { FastifyPluginAsync } from "fastify";
import { approvalDecisionSchema } from "@governor/shared";

export const approvalsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request) => {
    const query = request.query as {
      org_id?: string;
      status?: "PENDING" | "APPROVED" | "DENIED";
      limit?: string;
    };

    const limit = Math.min(Number(query.limit ?? 100), 500);

    const approvals = await app.prisma.approvalRequest.findMany({
      where: {
        orgId: query.org_id,
        status: query.status
      },
      orderBy: { requestedAt: "desc" },
      take: limit
    });

    return { approvals };
  });

  app.post("/decision", async (request) => {
    const payload = approvalDecisionSchema.parse(request.body);

    const existing = await app.prisma.approvalRequest.findUnique({
      where: { id: payload.approval_id }
    });

    if (!existing) {
      throw app.httpErrors.notFound("Approval request not found");
    }

    if (existing.status !== "PENDING") {
      throw app.httpErrors.conflict("Approval request already decided");
    }

    const status = payload.action === "APPROVE" ? "APPROVED" : "DENIED";

    const approval = await app.prisma.approvalRequest.update({
      where: { id: payload.approval_id },
      data: {
        status,
        decidedAt: new Date(),
        decidedBy: payload.decided_by
      }
    });

    await app.prisma.auditEvent.updateMany({
      where: {
        orgId: approval.orgId,
        agentId: approval.agentId,
        sessionId: approval.sessionId,
        toolName: approval.toolName,
        toolAction: approval.toolAction,
        status: "REQUIRES_APPROVAL"
      },
      data: {
        status: status === "APPROVED" ? "PENDING" : "DENIED"
      }
    });

    app.eventBus.publish({
      type: "approval.updated",
      org_id: approval.orgId,
      payload: {
        id: approval.id,
        status: approval.status,
        decided_at: approval.decidedAt,
        decided_by: approval.decidedBy
      }
    });

    return { approval };
  });
};
