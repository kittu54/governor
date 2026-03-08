import type { FastifyPluginAsync } from "fastify";
import { generateApiKey } from "../gateway/auth.js";
import { resolveRequestOrg } from "../../plugins/auth.js";

export const apiKeyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request) => {
    const orgId = resolveRequestOrg(request);

    const keys = await app.prisma.apiKey.findMany({
      where: { orgId },
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

    const orgId = resolveRequestOrg(request, { fromBody: body.org_id });

    if (!body.name) {
      throw app.httpErrors.badRequest("name is required");
    }

    const org = await app.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw app.httpErrors.notFound("Organization not found");

    const { raw, prefix, hash } = generateApiKey();

    const expiresAt = body.expires_in_days
      ? new Date(Date.now() + body.expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    const key = await app.prisma.apiKey.create({
      data: {
        orgId,
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
    const orgId = resolveRequestOrg(request);

    const key = await app.prisma.apiKey.findFirst({ where: { id: params.keyId, orgId } });
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
