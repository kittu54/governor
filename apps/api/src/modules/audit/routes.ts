import type { FastifyPluginAsync } from "fastify";
import { auditCompleteSchema } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth";

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get("/events", async (request) => {
    const orgId = resolveRequestOrg(request);

    const query = request.query as {
      agent_id?: string;
      tool_name?: string;
      decision?: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
      status?: "PENDING" | "SUCCESS" | "ERROR" | "DENIED" | "REQUIRES_APPROVAL";
      limit?: string;
    };

    const limit = Math.min(Number(query.limit ?? 100), 500);

    const events = await app.prisma.auditEvent.findMany({
      where: {
        orgId,
        agentId: query.agent_id,
        toolName: query.tool_name,
        decision: query.decision,
        status: query.status
      },
      orderBy: { timestamp: "desc" },
      take: limit
    });

    return { events };
  });

  app.post("/complete", async (request) => {
    const orgId = resolveRequestOrg(request);
    const payload = auditCompleteSchema.parse(request.body);

    const event = await app.prisma.auditEvent.findFirst({
      where: { id: payload.request_id, orgId },
    });
    if (!event) throw app.httpErrors.notFound("Audit event not found");

    const updated = await app.prisma.auditEvent.update({
      where: { id: payload.request_id },
      data: {
        status: payload.status,
        latencyMs: payload.latency_ms,
        outputSummary: payload.output_summary,
        errorMessage: payload.error_message
      }
    });

    app.eventBus.publish({
      type: "audit.updated",
      org_id: updated.orgId,
      payload: {
        id: updated.id,
        status: updated.status,
        latency_ms: updated.latencyMs,
        timestamp: updated.timestamp
      }
    });

    return { ok: true };
  });
};
