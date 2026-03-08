import type { FastifyPluginAsync } from "fastify";
import { generateApiKey } from "../gateway/auth";

export const apiKeyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request) => {
    const query = request.query as { org_id?: string };
    if (!query.org_id) {
      throw app.httpErrors.badRequest("org_id query parameter is required");
    }

    const keys = await app.prisma.apiKey.findMany({
      where: { orgId: query.org_id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        framework: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true
      }
    });

    return { keys };
  });

  app.post("/", async (request, reply) => {
    const body = request.body as {
      org_id: string;
      name: string;
      framework?: string;
      scopes?: string[];
      expires_in_days?: number;
    };

    if (!body.org_id || !body.name) {
      throw app.httpErrors.badRequest("org_id and name are required");
    }

    await app.prisma.organization.upsert({
      where: { id: body.org_id },
      create: { id: body.org_id, name: body.org_id },
      update: {}
    });

    const { raw, prefix, hash } = generateApiKey();

    const expiresAt = body.expires_in_days
      ? new Date(Date.now() + body.expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    const key = await app.prisma.apiKey.create({
      data: {
        orgId: body.org_id,
        name: body.name,
        keyHash: hash,
        keyPrefix: prefix,
        framework: body.framework ?? null,
        scopes: body.scopes ?? [],
        expiresAt
      }
    });

    return reply.code(201).send({
      id: key.id,
      name: key.name,
      key: raw,
      key_prefix: prefix,
      framework: key.framework,
      expires_at: key.expiresAt?.toISOString() ?? null,
      created_at: key.createdAt.toISOString(),
      warning: "Store this key securely. It will not be shown again."
    });
  });

  app.delete("/:keyId", async (request, reply) => {
    const params = request.params as { keyId: string };

    const key = await app.prisma.apiKey.findUnique({ where: { id: params.keyId } });
    if (!key) {
      throw app.httpErrors.notFound("API key not found");
    }

    await app.prisma.apiKey.update({
      where: { id: params.keyId },
      data: { revokedAt: new Date() }
    });

    return reply.send({ ok: true, revoked: true });
  });
};
