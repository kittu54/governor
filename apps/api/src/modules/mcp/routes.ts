import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { classifyToolRisk, isSensitiveRiskClass, riskClassSchema } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth.js";
import type { RiskClass } from "@governor/shared";

const createMCPServerSchema = z.object({
  org_id: z.string().min(1),
  name: z.string().min(1).max(200),
  base_url: z.string().url(),
  description: z.string().max(2000).optional(),
  auth_type: z.enum(["NONE", "API_KEY", "BEARER_TOKEN", "OAUTH"]).default("NONE"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateMCPServerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  base_url: z.string().url().optional(),
  description: z.string().max(2000).optional().nullable(),
  auth_type: z.enum(["NONE", "API_KEY", "BEARER_TOKEN", "OAUTH"]).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const syncToolsSchema = z.object({
  tools: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      input_schema: z.record(z.string(), z.unknown()).optional(),
      risk_class: riskClassSchema.optional(),
    })
  ).min(1),
});

export const mcpRoutes: FastifyPluginAsync = async (app) => {
  // ─── List MCP Servers ──────────────────────────────────────
  app.get("/servers", async (request, reply) => {
    const orgId = resolveRequestOrg(request);

    const servers = await app.prisma.mCPServer.findMany({
      where: { orgId },
      include: { _count: { select: { tools: true } } },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      servers: servers.map((s) => ({
        id: s.id,
        org_id: s.orgId,
        name: s.name,
        base_url: s.baseUrl,
        description: s.description,
        auth_type: s.authType,
        is_active: s.isActive,
        tool_count: s._count.tools,
        last_sync_at: s.lastSyncAt?.toISOString() ?? null,
        created_at: s.createdAt.toISOString(),
      })),
    });
  });

  // ─── Create MCP Server ─────────────────────────────────────
  app.post("/servers", async (request, reply) => {
    const payload = createMCPServerSchema.parse(request.body);
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });

    const server = await app.prisma.mCPServer.create({
      data: {
        orgId,
        name: payload.name,
        baseUrl: payload.base_url,
        description: payload.description,
        authType: payload.auth_type,
        metadata: payload.metadata as any,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId,
        actorType: "SYSTEM",
        eventType: "mcp_server.created",
        entityType: "MCPServer",
        entityId: server.id,
        summary: `Registered MCP server "${payload.name}" at ${payload.base_url}`,
      },
    });

    return reply.status(201).send({
      id: server.id,
      org_id: server.orgId,
      name: server.name,
      base_url: server.baseUrl,
      auth_type: server.authType,
      is_active: server.isActive,
    });
  });

  // ─── Get MCP Server Detail ─────────────────────────────────
  app.get("/servers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);

    const server = await app.prisma.mCPServer.findFirst({
      where: { id, orgId },
      include: {
        tools: { orderBy: { toolName: "asc" } },
      },
    });

    if (!server) return reply.status(404).send({ error: "MCP server not found" });

    return reply.send({
      id: server.id,
      org_id: server.orgId,
      name: server.name,
      base_url: server.baseUrl,
      description: server.description,
      auth_type: server.authType,
      is_active: server.isActive,
      last_sync_at: server.lastSyncAt?.toISOString() ?? null,
      tools: server.tools.map((t) => ({
        id: t.id,
        tool_name: t.toolName,
        description: t.description,
        risk_class: t.riskClass,
        is_sensitive: t.isSensitive,
        is_active: t.isActive,
        input_schema: t.inputSchema,
      })),
      created_at: server.createdAt.toISOString(),
    });
  });

  // ─── Update MCP Server ─────────────────────────────────────
  app.patch("/servers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);
    const payload = updateMCPServerSchema.parse(request.body);

    const existing = await app.prisma.mCPServer.findFirst({ where: { id, orgId } });
    if (!existing) return reply.status(404).send({ error: "MCP server not found" });

    const updated = await app.prisma.mCPServer.update({
      where: { id },
      data: {
        name: payload.name ?? undefined,
        baseUrl: payload.base_url ?? undefined,
        description: payload.description !== undefined ? payload.description : undefined,
        authType: payload.auth_type ?? undefined,
        isActive: payload.is_active ?? undefined,
        metadata: payload.metadata !== undefined ? (payload.metadata as any) : undefined,
      },
    });

    return reply.send({
      id: updated.id,
      name: updated.name,
      is_active: updated.isActive,
    });
  });

  // ─── Delete MCP Server ─────────────────────────────────────
  app.delete("/servers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);

    const existing = await app.prisma.mCPServer.findFirst({ where: { id, orgId } });
    if (!existing) return reply.status(404).send({ error: "MCP server not found" });

    await app.prisma.mCPServer.delete({ where: { id } });

    await app.prisma.auditLog.create({
      data: {
        orgId,
        actorType: "SYSTEM",
        eventType: "mcp_server.deleted",
        entityType: "MCPServer",
        entityId: id,
        summary: `Deleted MCP server "${existing.name}"`,
      },
    });

    return reply.send({ deleted: true });
  });

  // ─── Get Server Tools ──────────────────────────────────────
  app.get("/servers/:id/tools", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);

    const server = await app.prisma.mCPServer.findFirst({ where: { id, orgId } });
    if (!server) return reply.status(404).send({ error: "MCP server not found" });

    const tools = await app.prisma.mCPTool.findMany({
      where: { serverId: id },
      orderBy: { toolName: "asc" },
    });

    return reply.send({
      server_id: id,
      server_name: server.name,
      tools: tools.map((t) => ({
        id: t.id,
        tool_name: t.toolName,
        description: t.description,
        risk_class: t.riskClass,
        is_sensitive: t.isSensitive,
        is_active: t.isActive,
        input_schema: t.inputSchema,
      })),
    });
  });

  // ─── Sync Tools (discover + classify) ──────────────────────
  app.post("/servers/:id/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = resolveRequestOrg(request);
    const payload = syncToolsSchema.parse(request.body);

    const server = await app.prisma.mCPServer.findFirst({ where: { id, orgId } });
    if (!server) return reply.status(404).send({ error: "MCP server not found" });

    let created = 0;
    let updated = 0;
    const classified: { tool_name: string; risk_class: string; confidence: number }[] = [];

    for (const tool of payload.tools) {
      const toolName = tool.name as string;
      const toolDescription = tool.description as string | undefined;
      const classification = classifyToolRisk(server.name, toolName);
      const riskClass = (tool.risk_class as RiskClass) ?? classification.riskClass;
      const sensitive = isSensitiveRiskClass(riskClass);

      classified.push({
        tool_name: toolName,
        risk_class: riskClass,
        confidence: tool.risk_class ? 1.0 : classification.confidence,
      });

      const existing = await app.prisma.mCPTool.findUnique({
        where: { serverId_toolName: { serverId: id, toolName } },
      });

      if (existing) {
        await app.prisma.mCPTool.update({
          where: { id: existing.id },
          data: {
            description: toolDescription ?? existing.description,
            inputSchema: tool.input_schema as any ?? existing.inputSchema,
            riskClass,
            isSensitive: sensitive,
          },
        });
        updated += 1;
      } else {
        await app.prisma.mCPTool.create({
          data: {
            serverId: id,
            toolName,
            description: toolDescription,
            inputSchema: tool.input_schema as any,
            riskClass,
            isSensitive: sensitive,
          },
        });
        created += 1;
      }

      // Also register in the main Tool registry for policy evaluation
      await app.prisma.tool.upsert({
        where: {
          orgId_toolName_toolAction: { orgId, toolName: server.name, toolAction: toolName },
        },
        create: {
          orgId,
          toolName: server.name,
          toolAction: toolName,
          displayName: `${server.name} / ${toolName}`,
          description: toolDescription,
          riskClass,
          isSensitive: sensitive,
          metadata: { mcp_server_id: id } as any,
        },
        update: {
          description: toolDescription,
          riskClass,
          isSensitive: sensitive,
        },
      });
    }

    const toolCount = await app.prisma.mCPTool.count({ where: { serverId: id } });
    await app.prisma.mCPServer.update({
      where: { id },
      data: { lastSyncAt: new Date(), toolCount },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId,
        actorType: "SYSTEM",
        eventType: "mcp_server.synced",
        entityType: "MCPServer",
        entityId: id,
        summary: `Synced ${payload.tools.length} tools for MCP server "${server.name}" (${created} new, ${updated} updated)`,
        payload: { created, updated, tool_count: toolCount } as any,
      },
    });

    return reply.send({
      synced: true,
      server_id: id,
      created,
      updated,
      total_tools: toolCount,
      classified,
    });
  });
};
