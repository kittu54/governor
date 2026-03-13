import type { FastifyPluginAsync } from "fastify";

/**
 * Enforces that all routes in this scope have an authenticated org.
 *
 * In development mode with no Clerk keys: allows header-trust fallback.
 * In production: requires request.auth.orgId from Clerk JWT or API key.
 */
export const requireOrgAuth: FastifyPluginAsync = async (app) => {
    const isDevMode = () =>
        (app.config.NODE_ENV === "development" || app.config.NODE_ENV === "test") &&
        !app.config.CLERK_SECRET_KEY;

    app.addHook("preHandler", async (request, reply) => {
        // Dev mode with no Clerk: allow header-trust (existing local dev behavior)
        if (isDevMode() && request.auth.orgId) {
            return;
        }

        // Production: require authenticated org
        if (!request.auth.orgId) {
            if (isDevMode()) {
                // Dev mode but no org header either — let it through with a warning
                return;
            }
            return reply.code(401).send({
                error: "Unauthorized",
                message: "Authentication required. Provide a valid API key or Clerk session."
            });
        }

        // Validate org_id in body/query matches authenticated org
        const bodyOrgId = (request.body as Record<string, unknown>)?.org_id as string | undefined;
        const queryOrgId = (request.query as Record<string, unknown>)?.org_id as string | undefined;

        const providedOrgId = bodyOrgId || queryOrgId;
        if (providedOrgId && providedOrgId !== request.auth.orgId) {
            return reply.code(403).send({
                error: "Forbidden",
                message: "org_id does not match authenticated organization."
            });
        }
    });
};
