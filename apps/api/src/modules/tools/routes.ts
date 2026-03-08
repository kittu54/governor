import type { FastifyPluginAsync } from "fastify";
import { createToolSchema, updateToolSchema, classifyRiskSchema } from "@governor/shared";
import { classifyToolRisk, RISK_CLASS_META, RISK_CLASSES } from "@governor/shared";
import { resolveRequestOrg } from "../../plugins/auth.js";

export const toolsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const orgId = resolveRequestOrg(request);
    const { risk_class, search } = request.query as {
      risk_class?: string;
      search?: string;
    };

    const where: Record<string, unknown> = { orgId };
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
    const orgId = resolveRequestOrg(request, { fromBody: payload.org_id });

    const tool = await app.prisma.tool.upsert({
      where: {
        orgId_toolName_toolAction: {
          orgId,
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
        orgId,
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
        orgId,
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
    const orgId = resolveRequestOrg(request);

    const tool = await app.prisma.tool.findFirst({ where: { id, orgId } });
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
        orgId,
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
    // classify-risk is semi-public (works without auth for anonymous classification)
    // but if authenticated, enforce org_id mismatch protection
    const queryOrgId = (request.query as Record<string, string>)?.org_id;
    const authOrgId = request.auth?.orgId;
    if (authOrgId && queryOrgId && authOrgId !== queryOrgId) {
      const err = new Error("org_id mismatch: supplied org_id does not match authenticated organization");
      (err as any).statusCode = 403;
      throw err;
    }
    const orgId = authOrgId ?? queryOrgId;

    let orgOverrides;
    if (orgId) {
      const orgTools = await app.prisma.tool.findMany({
        where: { orgId },
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

  // ─── Batch Classify Risk ────────────────────────────────────
  app.post("/classify-risk/batch", async (request, reply) => {
    const body = request.body as {
      tools: { tool_name: string; tool_action: string }[];
      org_id?: string;
    };
    const { tools } = body;

    if (!Array.isArray(tools) || tools.length === 0) {
      return reply.status(400).send({ error: "tools array is required" });
    }
    if (tools.length > 100) {
      return reply.status(400).send({ error: "Maximum 100 tools per batch" });
    }

    // Semi-public: works without auth, but enforces mismatch when authenticated
    const authOrgId = request.auth?.orgId;
    const bodyOrgId = body.org_id;
    if (authOrgId && bodyOrgId && authOrgId !== bodyOrgId) {
      const err = new Error("org_id mismatch: supplied org_id does not match authenticated organization");
      (err as any).statusCode = 403;
      throw err;
    }
    const orgId = authOrgId ?? bodyOrgId;

    let orgOverrides: import("@governor/shared").ToolRiskMapping[] | undefined;
    if (orgId) {
      const orgTools = await app.prisma.tool.findMany({ where: { orgId } });
      orgOverrides = orgTools.map((t) => ({
        toolName: t.toolName,
        toolAction: t.toolAction,
        riskClass: t.riskClass as import("@governor/shared").RiskClass,
        reason: `Org registry: ${t.displayName || t.toolName}`,
      }));
    }

    const results = tools.map((tool) => {
      const result = classifyToolRisk(tool.tool_name, tool.tool_action, orgOverrides);
      return {
        tool_name: tool.tool_name,
        tool_action: tool.tool_action,
        risk_class: result.riskClass,
        source: result.source,
        reason: result.reason,
        confidence: result.confidence,
        severity: RISK_CLASS_META[result.riskClass]?.severity ?? 0,
      };
    });

    return reply.send({ classifications: results });
  });

  app.post("/auto-classify", async (request, reply) => {
    const body = request.body as {
      tools: { tool_name: string; tool_action: string; description?: string }[];
      org_id: string;
    };
    const orgId = resolveRequestOrg(request, { fromBody: body.org_id });
    const { tools } = body;

    if (!Array.isArray(tools) || tools.length === 0) {
      return reply.status(400).send({ error: "tools array is required" });
    }
    if (tools.length > 100) {
      return reply.status(400).send({ error: "Maximum 100 tools per request" });
    }

    const results = [];
    for (const tool of tools) {
      const result = classifyToolRisk(tool.tool_name, tool.tool_action);

      await app.prisma.tool.upsert({
        where: {
          orgId_toolName_toolAction: {
            orgId,
            toolName: tool.tool_name,
            toolAction: tool.tool_action,
          },
        },
        update: {
          riskClass: result.riskClass as any,
          isSensitive: ["MONEY_MOVEMENT", "CODE_EXECUTION", "CREDENTIAL_USE", "ADMIN_ACTION", "DATA_EXPORT"].includes(result.riskClass),
          description: tool.description,
        },
        create: {
          orgId,
          toolName: tool.tool_name,
          toolAction: tool.tool_action,
          riskClass: result.riskClass as any,
          isSensitive: ["MONEY_MOVEMENT", "CODE_EXECUTION", "CREDENTIAL_USE", "ADMIN_ACTION", "DATA_EXPORT"].includes(result.riskClass),
          description: tool.description,
        },
      });

      results.push({
        tool_name: tool.tool_name,
        tool_action: tool.tool_action,
        risk_class: result.riskClass,
        confidence: result.confidence,
        explanation: result.reason,
        source: result.source,
        severity: RISK_CLASS_META[result.riskClass]?.severity ?? 0,
        registered: true,
      });
    }

    await app.prisma.auditLog.create({
      data: {
        orgId,
        actorType: "SYSTEM",
        eventType: "tools.auto_classified",
        entityType: "Tool",
        summary: `Auto-classified ${results.length} tools`,
        payload: { tool_count: results.length, classifications: results.map((r) => `${r.tool_name}.${r.tool_action} → ${r.risk_class}`) } as any,
      },
    });

    return reply.send({
      classifications: results,
      total: results.length,
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
