import type { FastifyPluginAsync } from "fastify";
import { DEFAULT_FIREWALL_RULES } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth.js";
import { FirewallService } from "./service.js";

export const firewallRoutes: FastifyPluginAsync = async (app) => {
  const service = new FirewallService(app.prisma);

  app.get("/status", async (request, reply) => {
    const orgId = resolveRequestOrg(request);
    const status = await service.getStatus(orgId);
    return reply.send(status);
  });

  app.get("/rules", async (_request, reply) => {
    return reply.send({
      rules: DEFAULT_FIREWALL_RULES,
      total: DEFAULT_FIREWALL_RULES.length,
    });
  });

  app.post("/install", async (request, reply) => {
    const body = request.body as { org_id?: string };
    const orgId = resolveRequestOrg(request, { fromBody: body.org_id });

    try {
      const result = await service.install(orgId);
      return reply.status(201).send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Installation failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.delete("/uninstall", async (request, reply) => {
    const orgId = resolveRequestOrg(request);
    const result = await service.uninstall(orgId);
    return reply.send(result);
  });

  app.post("/bootstrap", async (request, reply) => {
    const body = request.body as { org_id?: string };
    const orgId = resolveRequestOrg(request, { fromBody: body.org_id });

    const wasInstalled = await service.ensureDefaults(orgId);
    return reply.send({
      bootstrapped: wasInstalled,
      message: wasInstalled
        ? "AI Action Firewall installed with default protections"
        : "Firewall already installed",
    });
  });
};
