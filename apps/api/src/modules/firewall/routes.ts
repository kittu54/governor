import type { FastifyPluginAsync } from "fastify";
import { DEFAULT_FIREWALL_RULES } from "@governor/shared";
import { FirewallService } from "./service";

export const firewallRoutes: FastifyPluginAsync = async (app) => {
  const service = new FirewallService(app.prisma);

  app.get("/status", async (request, reply) => {
    const { org_id } = request.query as { org_id: string };
    if (!org_id) return reply.status(400).send({ error: "org_id is required" });

    const status = await service.getStatus(org_id);
    return reply.send(status);
  });

  app.get("/rules", async (_request, reply) => {
    return reply.send({
      rules: DEFAULT_FIREWALL_RULES,
      total: DEFAULT_FIREWALL_RULES.length,
    });
  });

  app.post("/install", async (request, reply) => {
    const { org_id } = request.body as { org_id: string };
    if (!org_id) return reply.status(400).send({ error: "org_id is required" });

    try {
      const result = await service.install(org_id);
      return reply.status(201).send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Installation failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.delete("/uninstall", async (request, reply) => {
    const { org_id } = request.query as { org_id: string };
    if (!org_id) return reply.status(400).send({ error: "org_id is required" });

    const result = await service.uninstall(org_id);
    return reply.send(result);
  });

  app.post("/bootstrap", async (request, reply) => {
    const { org_id } = request.body as { org_id: string };
    if (!org_id) return reply.status(400).send({ error: "org_id is required" });

    const wasInstalled = await service.ensureDefaults(org_id);
    return reply.send({
      bootstrapped: wasInstalled,
      message: wasInstalled
        ? "AI Action Firewall installed with default protections"
        : "Firewall already installed",
    });
  });
};
