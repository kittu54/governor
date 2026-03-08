import type { FastifyPluginAsync } from "fastify";
import { gatewayCheckSchema } from "@governor/shared";
import { PolicyService } from "../policy/service";
import { resolveApiKey } from "./auth";

export const gatewayRoutes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService({
    prisma: app.prisma,
    redis: app.redis,
    eventBus: app.eventBus
  });

  /**
   * POST /v1/gateway/check
   *
   * The universal governance checkpoint. Any agent platform — no-code, enterprise,
   * SDK, or webhook — calls this before performing an action.
   *
   * Auth: API key via `x-governor-key` header or `Authorization: Bearer <key>`.
   * The key resolves the org_id automatically.
   *
   * Returns:
   *   200 + { allowed: true }  → proceed
   *   200 + { allowed: false } → blocked or needs approval
   *   401                      → bad/missing key
   */
  app.post("/check", async (request, reply) => {
    const apiKey = await resolveApiKey(app.prisma, request);
    if (!apiKey) {
      return reply.code(401).send({
        allowed: false,
        error: "Invalid or missing API key. Pass via x-governor-key header or Authorization: Bearer <key>"
      });
    }

    const body = gatewayCheckSchema.parse(request.body);

    await app.prisma.agent.upsert({
      where: { id: body.agent_id },
      create: {
        id: body.agent_id,
        orgId: apiKey.orgId,
        name: body.agent_id,
        status: "ACTIVE",
        framework: apiKey.framework
      },
      update: {}
    });

    const result = await service.evaluate({
      org_id: apiKey.orgId,
      agent_id: body.agent_id,
      tool_name: body.tool_name,
      tool_action: body.tool_action,
      cost_estimate_usd: body.cost_estimate_usd ?? 0,
      user_id: body.user_id,
      session_id: body.session_id,
      input_summary: body.input_summary
    });

    await app.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    });

    const allowed = result.decision === "ALLOW";

    return reply.send({
      allowed,
      decision: result.decision,
      request_id: result.request_id,
      approval_request_id: result.approval_request_id ?? null,
      trace: result.trace,
      message: allowed
        ? "Action permitted"
        : result.decision === "DENY"
          ? "Action blocked by policy"
          : "Action requires human approval before proceeding"
    });
  });

  /**
   * GET /v1/gateway/health
   * Quick health check for integrations to verify connectivity and key validity.
   */
  app.get("/health", async (request, reply) => {
    const apiKey = await resolveApiKey(app.prisma, request);
    if (!apiKey) {
      return reply.code(401).send({ ok: false, error: "Invalid API key" });
    }

    return reply.send({
      ok: true,
      org_id: apiKey.orgId,
      key_name: apiKey.name,
      framework: apiKey.framework
    });
  });

  /**
   * POST /v1/gateway/report
   * Lightweight telemetry endpoint for platforms that can't use the full ingest API.
   * Agents report outcomes after performing allowed actions.
   */
  app.post("/report", async (request, reply) => {
    const apiKey = await resolveApiKey(app.prisma, request);
    if (!apiKey) {
      return reply.code(401).send({ error: "Invalid API key" });
    }

    const body = request.body as {
      request_id: string;
      status: "SUCCESS" | "ERROR";
      latency_ms?: number;
      output_summary?: string;
      error_message?: string;
    };

    if (!body.request_id || !body.status) {
      return reply.code(400).send({ error: "request_id and status are required" });
    }

    await app.prisma.auditEvent.update({
      where: { id: body.request_id },
      data: {
        status: body.status,
        latencyMs: body.latency_ms,
        outputSummary: body.output_summary,
        errorMessage: body.error_message
      }
    }).catch(() => null);

    return reply.send({ ok: true });
  });
};
