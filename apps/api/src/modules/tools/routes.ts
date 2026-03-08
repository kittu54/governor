import type { FastifyPluginAsync } from "fastify";
import { createToolSchema, updateToolSchema, classifyRiskSchema } from "@governor/shared";
import { classifyToolRisk, RISK_CLASS_META, RISK_CLASSES } from "@governor/shared";

export const toolsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const { org_id, risk_class, search } = request.query as {
      org_id: string;
      risk_class?: string;
      search?: string;
    };
    if (!org_id) return reply.status(400).send({ error: "org_id is required" });

    const where: Record<string, unknown> = { orgId: org_id };
    if (risk_class) where.riskClass = risk_class;
    if (search) {
      where.OR = [
        { toolName: { contains: search, mode: "insensitive" } },
        { toolAction: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    const tools = await app.prisma.tool.findMany({
      where,
      orderBy: { toolName: "asc" },
    });

    return reply.send({
      tools: tools.map((t) => ({
        id: t.id,
        org_id: t.orgId,
        tool_name: t.toolName,
        tool_action: t.toolAction,
        display_name: t.displayName,
        description: t.description,
        risk_class: t.riskClass,
        risk_severity: RISK_CLASS_META[t.riskClass as keyof typeof RISK_CLASS_META]?.severity ?? 0,
        is_sensitive: t.isSensitive,
        metadata: t.metadata,
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
      })),
    });
  });

  app.post("/", async (request, reply) => {
    const payload = createToolSchema.parse(request.body);

    const tool = await app.prisma.tool.upsert({
      where: {
        orgId_toolName_toolAction: {
          orgId: payload.org_id,
          toolName: payload.tool_name,
          toolAction: payload.tool_action,
        },
      },
      update: {
        displayName: payload.display_name,
        description: payload.description,
        riskClass: payload.risk_class as any,
        isSensitive: payload.is_sensitive,
        metadata: (payload.metadata ?? undefined) as any,
      },
      create: {
        orgId: payload.org_id,
        toolName: payload.tool_name,
        toolAction: payload.tool_action,
        displayName: payload.display_name,
        description: payload.description,
        riskClass: payload.risk_class as any,
        isSensitive: payload.is_sensitive,
        metadata: (payload.metadata ?? undefined) as any,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId: payload.org_id,
        actorType: "USER",
        eventType: "tool.registered",
        entityType: "Tool",
        entityId: tool.id,
        summary: `Registered tool ${payload.tool_name}.${payload.tool_action} as ${payload.risk_class}`,
      },
    });

    return reply.status(201).send({
      id: tool.id,
      org_id: tool.orgId,
      tool_name: tool.toolName,
      tool_action: tool.toolAction,
      risk_class: tool.riskClass,
      is_sensitive: tool.isSensitive,
    });
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = updateToolSchema.parse(request.body);
    const { org_id } = request.query as { org_id: string };
    if (!org_id) return reply.status(400).send({ error: "org_id is required" });

    const tool = await app.prisma.tool.findFirst({ where: { id, orgId: org_id } });
    if (!tool) return reply.status(404).send({ error: "Tool not found" });

    const updated = await app.prisma.tool.update({
      where: { id },
      data: {
        displayName: payload.display_name !== undefined ? payload.display_name : undefined,
        description: payload.description !== undefined ? payload.description : undefined,
        riskClass: (payload.risk_class ?? undefined) as any,
        isSensitive: payload.is_sensitive ?? undefined,
        metadata: (payload.metadata !== undefined ? payload.metadata ?? undefined : undefined) as any,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId: org_id,
        actorType: "USER",
        eventType: "tool.updated",
        entityType: "Tool",
        entityId: id,
        summary: `Updated tool ${updated.toolName}.${updated.toolAction}`,
        payload: payload as any,
      },
    });

    return reply.send({
      id: updated.id,
      tool_name: updated.toolName,
      tool_action: updated.toolAction,
      risk_class: updated.riskClass,
      is_sensitive: updated.isSensitive,
    });
  });

  app.post("/classify-risk", async (request, reply) => {
    const payload = classifyRiskSchema.parse(request.body);
    const { org_id } = request.query as { org_id?: string };

    let orgOverrides;
    if (org_id) {
      const orgTools = await app.prisma.tool.findMany({
        where: { orgId: org_id },
      });
      orgOverrides = orgTools.map((t) => ({
        toolName: t.toolName,
        toolAction: t.toolAction,
        riskClass: t.riskClass as import("@governor/shared").RiskClass,
        reason: `Org registry: ${t.displayName || t.toolName}`,
      }));
    }

    const result = classifyToolRisk(payload.tool_name, payload.tool_action, orgOverrides);

    return reply.send({
      tool_name: payload.tool_name,
      tool_action: payload.tool_action,
      risk_class: result.riskClass,
      source: result.source,
      reason: result.reason,
      confidence: result.confidence,
      severity: RISK_CLASS_META[result.riskClass]?.severity ?? 0,
    });
  });

  app.get("/risk-classes", async (_request, reply) => {
    return reply.send({
      risk_classes: RISK_CLASSES.map((rc) => ({
        id: rc,
        ...RISK_CLASS_META[rc],
      })),
    });
  });
};
