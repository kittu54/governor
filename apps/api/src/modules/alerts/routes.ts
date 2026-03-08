import type { FastifyPluginAsync } from "fastify";
import { resolveRequestOrg } from "../../plugins/auth.js";
import { AlertService } from "./service.js";

export const alertRoutes: FastifyPluginAsync = async (app) => {
  const service = new AlertService(app.prisma, app.eventBus);

  app.get("/", async (request, reply) => {
    const orgId = resolveRequestOrg(request);

    const configs = await service.getConfigs(orgId);
    return reply.send({
      configs: configs.map((c) => ({
        id: c.id,
        org_id: c.orgId,
        name: c.name,
        channel: c.channel,
        alert_types: c.alertTypes,
        config: c.config,
        is_active: c.isActive,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
      })),
    });
  });

  app.post("/webhook", async (request, reply) => {
    const { name, url, secret, alert_types } = request.body as {
      org_id: string;
      name?: string;
      url: string;
      secret?: string;
      alert_types?: string[];
    };
    const orgId = resolveRequestOrg(request, { fromBody: (request.body as any).org_id });

    if (!url) {
      return reply.status(400).send({ error: "url is required" });
    }

    const config = await service.createConfig({
      orgId,
      name: name ?? "Webhook Alert",
      channel: "WEBHOOK",
      alertTypes: alert_types ?? ["*"],
      config: { url, secret },
    });

    return reply.status(201).send({
      id: config.id,
      channel: "WEBHOOK",
      name: config.name,
      is_active: config.isActive,
    });
  });

  app.post("/slack", async (request, reply) => {
    const { name, webhook_url, alert_types } = request.body as {
      org_id: string;
      name?: string;
      webhook_url: string;
      alert_types?: string[];
    };
    const orgId = resolveRequestOrg(request, { fromBody: (request.body as any).org_id });

    if (!webhook_url) {
      return reply.status(400).send({ error: "webhook_url is required" });
    }

    const config = await service.createConfig({
      orgId,
      name: name ?? "Slack Alert",
      channel: "SLACK",
      alertTypes: alert_types ?? ["*"],
      config: { webhook_url },
    });

    return reply.status(201).send({
      id: config.id,
      channel: "SLACK",
      name: config.name,
      is_active: config.isActive,
    });
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);

    const body = request.body as Record<string, unknown>;
    const updated = await service.updateConfig(id, orgId, {
      name: body.name as string | undefined,
      alertTypes: body.alert_types as string[] | undefined,
      config: body.config as Record<string, unknown> | undefined,
      isActive: body.is_active as boolean | undefined,
    });

    return reply.send({
      id: updated.id,
      name: updated.name,
      is_active: updated.isActive,
    });
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);

    const config = await app.prisma.alertConfig.findFirst({ where: { id, orgId } });
    if (!config) return reply.status(404).send({ error: "Alert config not found" });

    await service.deleteConfig(id);
    return reply.send({ deleted: true });
  });

  app.post("/test", async (request, reply) => {
    const { alert_type, title, message } = request.body as {
      org_id: string;
      alert_type?: string;
      title?: string;
      message?: string;
    };
    const orgId = resolveRequestOrg(request, { fromBody: (request.body as any).org_id });

    const result = await service.fire({
      org_id: orgId,
      alert_type: (alert_type as any) ?? "HIGH_RISK_ACTION",
      severity: "medium",
      title: title ?? "Test Alert",
      message: message ?? "This is a test alert from Governor.",
    });

    return reply.send(result);
  });
};
