import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { createWebhookSchema, updateWebhookSchema } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth.js";

export const webhooksRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const orgId = resolveRequestOrg(request);

    const webhooks = await app.prisma.webhook.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      webhooks: webhooks.map((w) => ({
        id: w.id,
        org_id: w.orgId,
        target_url: w.targetUrl,
        event_types: w.eventTypes,
        is_active: w.isActive,
        last_delivery_at: w.lastDeliveryAt?.toISOString() ?? null,
        created_at: w.createdAt.toISOString(),
      })),
    });
  });

  app.post("/", async (request, reply) => {
    const payload = createWebhookSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });
    const secret = randomBytes(32).toString("hex");

    const webhook = await app.prisma.webhook.create({
      data: {
        orgId,
        targetUrl: payload.target_url,
        secret,
        eventTypes: payload.event_types,
        isActive: payload.is_active,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId,
        actorType: "USER",
        eventType: "webhook.created",
        entityType: "Webhook",
        entityId: webhook.id,
        summary: `Created webhook for ${payload.target_url}`,
      },
    });

    return reply.status(201).send({
      id: webhook.id,
      target_url: webhook.targetUrl,
      secret,
      event_types: webhook.eventTypes,
      is_active: webhook.isActive,
    });
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);
    const payload = updateWebhookSchema.parse(request.body);

    const existing = await app.prisma.webhook.findFirst({ where: { id, orgId } });
    if (!existing) return reply.status(404).send({ error: "Webhook not found" });

    const updated = await app.prisma.webhook.update({
      where: { id },
      data: {
        targetUrl: payload.target_url ?? undefined,
        eventTypes: payload.event_types ?? undefined,
        isActive: payload.is_active ?? undefined,
      },
    });

    return reply.send({
      id: updated.id,
      target_url: updated.targetUrl,
      event_types: updated.eventTypes,
      is_active: updated.isActive,
    });
  });

  app.post("/:id/test", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);

    const webhook = await app.prisma.webhook.findFirst({ where: { id, orgId } });
    if (!webhook) return reply.status(404).send({ error: "Webhook not found" });

    const testPayload = {
      event: "webhook.test",
      org_id: orgId,
      timestamp: new Date().toISOString(),
      data: { message: "This is a test delivery from Governor" },
    };

    try {
      const response = await fetch(webhook.targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Governor-Signature": webhook.secret.substring(0, 8),
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      await app.prisma.webhook.update({
        where: { id },
        data: { lastDeliveryAt: new Date() },
      });

      return reply.send({
        delivered: true,
        status_code: response.status,
        response_ok: response.ok,
      });
    } catch (err) {
      return reply.send({
        delivered: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });
};
