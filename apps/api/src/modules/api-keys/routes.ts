import type { FastifyPluginAsync } from "fastify";
import { generateApiKey } from "../../plugins/auth";

export const apiKeysRoutes: FastifyPluginAsync = async (app) => {
    // Create a new API key
    app.post("/", async (request, reply) => {
        const orgId = request.auth.orgId;
        if (!orgId) {
            throw app.httpErrors.unauthorized("Authentication required");
        }

        const body = request.body as { label?: string };
        const label = body.label?.trim() || "Default";

        const { raw, prefix, hash } = generateApiKey();

        const apiKey = await app.prisma.apiKey.create({
            data: {
                orgId,
                label,
                prefix,
                keyHash: hash,
                createdBy: request.auth.userId
            }
        });

        app.eventBus.publish({
            type: "api_key.created",
            org_id: orgId,
            payload: {
                id: apiKey.id,
                label: apiKey.label,
                prefix: apiKey.prefix,
                created_at: apiKey.createdAt
            }
        });

        return reply.code(201).send({
            id: apiKey.id,
            label: apiKey.label,
            prefix: apiKey.prefix,
            key: raw,  // Shown ONCE — never returned again
            created_at: apiKey.createdAt
        });
    });

    // List API keys for the authenticated org
    app.get("/", async (request) => {
        const orgId = request.auth.orgId;
        if (!orgId) {
            throw app.httpErrors.unauthorized("Authentication required");
        }

        const keys = await app.prisma.apiKey.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                label: true,
                prefix: true,
                lastUsedAt: true,
                revokedAt: true,
                createdAt: true,
                createdBy: true
            }
        });

        return { api_keys: keys };
    });

    // Revoke an API key (soft delete)
    app.delete("/:id", async (request, reply) => {
        const orgId = request.auth.orgId;
        if (!orgId) {
            throw app.httpErrors.unauthorized("Authentication required");
        }

        const params = request.params as { id: string };

        const existing = await app.prisma.apiKey.findUnique({
            where: { id: params.id }
        });

        if (!existing || existing.orgId !== orgId) {
            throw app.httpErrors.notFound("API key not found");
        }

        if (existing.revokedAt) {
            throw app.httpErrors.conflict("API key already revoked");
        }

        const revoked = await app.prisma.apiKey.update({
            where: { id: params.id },
            data: { revokedAt: new Date() }
        });

        app.eventBus.publish({
            type: "api_key.revoked",
            org_id: orgId,
            payload: {
                id: revoked.id,
                label: revoked.label,
                revoked_at: revoked.revokedAt
            }
        });

        return reply.send({ ok: true, id: revoked.id });
    });
};
