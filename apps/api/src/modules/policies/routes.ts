import type { FastifyPluginAsync } from "fastify";
import { createPolicySchema, updatePolicySchema, createPolicyVersionSchema, policyDefinitionSchema } from "@governor/shared";
import { compilePolicy, generateChecksum, diffPolicyDefinitions } from "@governor/policy-engine";
import type { PolicyDefinition } from "@governor/shared";

export const policiesRoutes: FastifyPluginAsync = async (app) => {
  // ─── List Policies ──────────────────────────────────────────
  app.get("/", async (request, reply) => {
    const { org_id, status } = request.query as { org_id: string; status?: string };
    if (!org_id) return reply.status(400).send({ error: "org_id is required" });

    const where: Record<string, unknown> = { orgId: org_id };
    if (status) where.status = status;

    const policies = await app.prisma.policy.findMany({
      where,
      include: {
        currentVersion: true,
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return reply.send({
      policies: policies.map((p) => ({
        id: p.id,
        org_id: p.orgId,
        name: p.name,
        description: p.description,
        status: p.status,
        enforcement_mode: p.enforcementMode,
        created_by: p.createdBy,
        current_version_id: p.currentVersionId,
        current_version_number: p.currentVersion?.versionNumber ?? null,
        version_count: p._count.versions,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      })),
    });
  });

  // ─── Create Policy ──────────────────────────────────────────
  app.post("/", async (request, reply) => {
    const payload = createPolicySchema.parse(request.body);

    const policy = await app.prisma.policy.create({
      data: {
        orgId: payload.org_id,
        name: payload.name,
        description: payload.description,
        enforcementMode: payload.enforcement_mode,
        createdBy: payload.created_by,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId: payload.org_id,
        actorType: payload.created_by ? "USER" : "SYSTEM",
        actorId: payload.created_by,
        eventType: "policy.created",
        entityType: "Policy",
        entityId: policy.id,
        summary: `Created policy "${payload.name}"`,
      },
    });

    return reply.status(201).send({
      id: policy.id,
      org_id: policy.orgId,
      name: policy.name,
      status: policy.status,
      enforcement_mode: policy.enforcementMode,
    });
  });

  // ─── Get Policy Detail ──────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { org_id } = request.query as { org_id: string };

    const policy = await app.prisma.policy.findFirst({
      where: { id, orgId: org_id },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 10,
        },
      },
    });

    if (!policy) return reply.status(404).send({ error: "Policy not found" });

    return reply.send({
      id: policy.id,
      org_id: policy.orgId,
      name: policy.name,
      description: policy.description,
      status: policy.status,
      enforcement_mode: policy.enforcementMode,
      created_by: policy.createdBy,
      current_version_id: policy.currentVersionId,
      current_version: policy.currentVersion
        ? {
            id: policy.currentVersion.id,
            version_number: policy.currentVersion.versionNumber,
            definition: policy.currentVersion.definitionJson,
            checksum: policy.currentVersion.checksum,
            is_published: policy.currentVersion.isPublished,
            created_at: policy.currentVersion.createdAt.toISOString(),
          }
        : null,
      versions: policy.versions.map((v) => ({
        id: v.id,
        version_number: v.versionNumber,
        checksum: v.checksum,
        change_summary: v.changeSummary,
        is_published: v.isPublished,
        created_by: v.createdBy,
        created_at: v.createdAt.toISOString(),
      })),
      created_at: policy.createdAt.toISOString(),
      updated_at: policy.updatedAt.toISOString(),
    });
  });

  // ─── Update Policy ──────────────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { org_id } = request.query as { org_id: string };
    const payload = updatePolicySchema.parse(request.body);

    const existing = await app.prisma.policy.findFirst({ where: { id, orgId: org_id } });
    if (!existing) return reply.status(404).send({ error: "Policy not found" });

    const updated = await app.prisma.policy.update({
      where: { id },
      data: {
        name: payload.name ?? undefined,
        description: payload.description !== undefined ? payload.description : undefined,
        status: payload.status ?? undefined,
        enforcementMode: payload.enforcement_mode ?? undefined,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId: org_id,
        actorType: "USER",
        eventType: "policy.updated",
        entityType: "Policy",
        entityId: id,
        summary: `Updated policy "${updated.name}"`,
        payload: payload as any,
      },
    });

    return reply.send({
      id: updated.id,
      name: updated.name,
      status: updated.status,
      enforcement_mode: updated.enforcementMode,
    });
  });

  // ─── Create Policy Version ─────────────────────────────────
  app.post("/:id/versions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { org_id } = request.query as { org_id: string };
    const payload = createPolicyVersionSchema.parse(request.body);

    const policy = await app.prisma.policy.findFirst({ where: { id, orgId: org_id } });
    if (!policy) return reply.status(404).send({ error: "Policy not found" });

    const compilation = compilePolicy(payload.definition as any);
    if (!compilation.valid) {
      return reply.status(400).send({
        error: "Invalid policy definition",
        validation_errors: compilation.errors,
        warnings: compilation.warnings,
      });
    }

    const lastVersion = await app.prisma.policyVersion.findFirst({
      where: { policyId: id },
      orderBy: { versionNumber: "desc" },
    });

    const nextVersion = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await app.prisma.policyVersion.create({
      data: {
        policyId: id,
        versionNumber: nextVersion,
        definitionJson: payload.definition as any,
        checksum: compilation.checksum,
        changeSummary: payload.change_summary,
        createdBy: payload.created_by,
      },
    });

    await app.prisma.auditLog.create({
      data: {
        orgId: org_id,
        actorType: payload.created_by ? "USER" : "SYSTEM",
        actorId: payload.created_by,
        eventType: "policy_version.created",
        entityType: "PolicyVersion",
        entityId: version.id,
        summary: `Created version ${nextVersion} for policy "${policy.name}"`,
        payload: { warnings: compilation.warnings } as any,
      },
    });

    return reply.status(201).send({
      id: version.id,
      policy_id: id,
      version_number: version.versionNumber,
      checksum: version.checksum,
      change_summary: version.changeSummary,
      warnings: compilation.warnings,
      created_at: version.createdAt.toISOString(),
    });
  });

  // ─── List Policy Versions ─────────────────────────────────
  app.get("/:id/versions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { org_id } = request.query as { org_id: string };

    const policy = await app.prisma.policy.findFirst({ where: { id, orgId: org_id } });
    if (!policy) return reply.status(404).send({ error: "Policy not found" });

    const versions = await app.prisma.policyVersion.findMany({
      where: { policyId: id },
      orderBy: { versionNumber: "desc" },
    });

    return reply.send({
      versions: versions.map((v) => ({
        id: v.id,
        version_number: v.versionNumber,
        checksum: v.checksum,
        change_summary: v.changeSummary,
        is_published: v.isPublished,
        created_by: v.createdBy,
        created_at: v.createdAt.toISOString(),
      })),
    });
  });

  // ─── Get Policy Version Detail ─────────────────────────────
  app.get("/versions/:versionId", async (request, reply) => {
    const { versionId } = request.params as { versionId: string };

    const version = await app.prisma.policyVersion.findUnique({
      where: { id: versionId },
      include: { policy: true },
    });

    if (!version) return reply.status(404).send({ error: "Policy version not found" });

    return reply.send({
      id: version.id,
      policy_id: version.policyId,
      policy_name: version.policy.name,
      version_number: version.versionNumber,
      definition: version.definitionJson,
      checksum: version.checksum,
      change_summary: version.changeSummary,
      is_published: version.isPublished,
      created_by: version.createdBy,
      created_at: version.createdAt.toISOString(),
    });
  });

  // ─── Publish Version ───────────────────────────────────────
  app.post("/versions/:versionId/publish", async (request, reply) => {
    const { versionId } = request.params as { versionId: string };
    const { org_id } = request.query as { org_id: string };

    const version = await app.prisma.policyVersion.findUnique({
      where: { id: versionId },
      include: { policy: true },
    });

    if (!version) return reply.status(404).send({ error: "Policy version not found" });
    if (version.policy.orgId !== org_id) return reply.status(403).send({ error: "Forbidden" });

    await app.prisma.$transaction([
      app.prisma.policyVersion.updateMany({
        where: { policyId: version.policyId },
        data: { isPublished: false },
      }),
      app.prisma.policyVersion.update({
        where: { id: versionId },
        data: { isPublished: true },
      }),
      app.prisma.policy.update({
        where: { id: version.policyId },
        data: {
          currentVersionId: versionId,
          status: "PUBLISHED",
        },
      }),
    ]);

    await app.prisma.auditLog.create({
      data: {
        orgId: org_id,
        actorType: "USER",
        eventType: "policy_version.published",
        entityType: "PolicyVersion",
        entityId: versionId,
        summary: `Published version ${version.versionNumber} of policy "${version.policy.name}"`,
      },
    });

    app.eventBus.publish({
      type: "policy.published",
      org_id,
      payload: {
        policy_id: version.policyId,
        version_id: versionId,
        version_number: version.versionNumber,
      },
    });

    return reply.send({
      published: true,
      policy_id: version.policyId,
      version_id: versionId,
      version_number: version.versionNumber,
    });
  });

  // ─── Rollback Target ──────────────────────────────────────
  app.post("/versions/:versionId/rollback-target", async (request, reply) => {
    const { versionId } = request.params as { versionId: string };
    const { org_id } = request.query as { org_id: string };

    const version = await app.prisma.policyVersion.findUnique({
      where: { id: versionId },
      include: { policy: true },
    });

    if (!version) return reply.status(404).send({ error: "Policy version not found" });
    if (version.policy.orgId !== org_id) return reply.status(403).send({ error: "Forbidden" });

    await app.prisma.$transaction([
      app.prisma.policyVersion.updateMany({
        where: { policyId: version.policyId },
        data: { isPublished: false },
      }),
      app.prisma.policyVersion.update({
        where: { id: versionId },
        data: { isPublished: true },
      }),
      app.prisma.policy.update({
        where: { id: version.policyId },
        data: { currentVersionId: versionId },
      }),
    ]);

    await app.prisma.auditLog.create({
      data: {
        orgId: org_id,
        actorType: "USER",
        eventType: "policy_version.rollback",
        entityType: "PolicyVersion",
        entityId: versionId,
        summary: `Rolled back to version ${version.versionNumber} of policy "${version.policy.name}"`,
      },
    });

    return reply.send({
      rolled_back: true,
      policy_id: version.policyId,
      version_id: versionId,
      version_number: version.versionNumber,
    });
  });

  // ─── Validate Policy Definition ─────────────────────────────
  app.post("/validate", async (request, reply) => {
    const body = request.body as { definition?: unknown };
    if (!body?.definition) {
      return reply.status(400).send({ error: "definition is required" });
    }

    const parseResult = policyDefinitionSchema.safeParse(body.definition);
    if (!parseResult.success) {
      return reply.status(400).send({
        valid: false,
        schema_errors: parseResult.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
        compilation_errors: [],
        warnings: [],
      });
    }

    const compilation = compilePolicy(parseResult.data as unknown as PolicyDefinition);

    return reply.send({
      valid: compilation.valid,
      schema_errors: [],
      compilation_errors: compilation.errors,
      warnings: compilation.warnings,
      checksum: compilation.valid ? compilation.checksum : undefined,
    });
  });

  // ─── Diff Versions (structured) ────────────────────────────
  app.get("/versions/:versionId/diff/:otherVersionId", async (request, reply) => {
    const { versionId, otherVersionId } = request.params as { versionId: string; otherVersionId: string };

    const [v1, v2] = await Promise.all([
      app.prisma.policyVersion.findUnique({ where: { id: versionId } }),
      app.prisma.policyVersion.findUnique({ where: { id: otherVersionId } }),
    ]);

    if (!v1 || !v2) return reply.status(404).send({ error: "One or both versions not found" });
    if (v1.policyId !== v2.policyId) return reply.status(400).send({ error: "Versions must belong to the same policy" });

    const def1 = v1.definitionJson as unknown as PolicyDefinition;
    const def2 = v2.definitionJson as unknown as PolicyDefinition;

    const diff = diffPolicyDefinitions(def1, def2);

    return reply.send({
      version_a: { id: v1.id, version_number: v1.versionNumber, checksum: v1.checksum },
      version_b: { id: v2.id, version_number: v2.versionNumber, checksum: v2.checksum },
      checksums_match: v1.checksum === v2.checksum,
      diff,
      definition_a: def1,
      definition_b: def2,
    });
  });
};
