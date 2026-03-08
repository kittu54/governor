import type { FastifyPluginAsync } from "fastify";
import { verifyAuditChain } from "./hash";
import { resolveRequestOrg } from "../../plugins/auth";

export const auditLogRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const orgId = resolveRequestOrg(request);

    const query = request.query as {
      event_type?: string;
      entity_type?: string;
      entity_id?: string;
      actor_type?: string;
      from?: string;
      to?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(Number(query.limit ?? 50), 200);
    const offset = Number(query.offset ?? 0);

    const where: Record<string, unknown> = { orgId };
    if (query.event_type) where.eventType = query.event_type;
    if (query.entity_type) where.entityType = query.entity_type;
    if (query.entity_id) where.entityId = query.entity_id;
    if (query.actor_type) where.actorType = query.actor_type;
    if (query.search) {
      where.OR = [
        { summary: { contains: query.search, mode: "insensitive" } },
        { eventType: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const dateFilter: Record<string, unknown> = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const [entries, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      app.prisma.auditLog.count({ where }),
    ]);

    return reply.send({
      entries: entries.map((e) => ({
        id: e.id,
        org_id: e.orgId,
        actor_type: e.actorType,
        actor_id: e.actorId,
        event_type: e.eventType,
        entity_type: e.entityType,
        entity_id: e.entityId,
        summary: e.summary,
        payload: e.payload,
        checksum: e.checksum,
        previous_hash: e.previousHash,
        created_at: e.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);

    const entry = await app.prisma.auditLog.findFirst({ where: { id, orgId } });
    if (!entry) return reply.status(404).send({ error: "Audit log entry not found" });

    return reply.send({
      id: entry.id,
      org_id: entry.orgId,
      actor_type: entry.actorType,
      actor_id: entry.actorId,
      event_type: entry.eventType,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      summary: entry.summary,
      payload: entry.payload,
      checksum: entry.checksum,
      previous_hash: entry.previousHash,
      created_at: entry.createdAt.toISOString(),
    });
  });

  // ─── Verify Audit Chain Integrity ──────────────────────────
  app.get("/verify", async (request, reply) => {
    const orgId = resolveRequestOrg(request);
    const { limit } = request.query as { limit?: string };

    const maxEntries = Math.min(Number(limit ?? 1000), 5000);
    const result = await verifyAuditChain(app.prisma, orgId, maxEntries);

    return reply.send(result);
  });
};
