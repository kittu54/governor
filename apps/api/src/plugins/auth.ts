import { verifyToken } from "@clerk/backend";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { resolveApiKey } from "../modules/gateway/auth";

const authPluginImpl: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request) => {
    request.auth = {};

    const authHeader = request.headers.authorization;
    const governorKey = request.headers["x-governor-key"];

    // 1) API key auth (SDK / external integrations)
    if (typeof governorKey === "string" && governorKey.length > 0) {
      const apiKey = await resolveApiKey(app.prisma, request);
      if (apiKey) {
        request.auth.orgId = apiKey.orgId;
        request.auth.apiKeyId = apiKey.id;
        request.auth.authMethod = "api_key";
        return;
      }
    }

    // 2) Bearer token — could be Clerk JWT or API key
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      // Try API key first (gov_ prefix)
      if (token.startsWith("gov_")) {
        const apiKey = await resolveApiKey(app.prisma, request);
        if (apiKey) {
          request.auth.orgId = apiKey.orgId;
          request.auth.apiKeyId = apiKey.id;
          request.auth.authMethod = "api_key";
          return;
        }
      }

      // Try Clerk JWT
      if (app.config.CLERK_SECRET_KEY) {
        try {
          const verified = await verifyToken(token, {
            secretKey: app.config.CLERK_SECRET_KEY,
          });
          request.auth.userId = verified.sub;
          request.auth.orgId = (verified as Record<string, unknown>).org_id as string | undefined;
          request.auth.authMethod = "clerk";
          return;
        } catch {
          // Token invalid — fall through
        }
      }
    }

    // 3) Development/test fallback: trust x-org-id / x-user-id headers
    if (app.config.NODE_ENV !== "production") {
      request.auth.orgId = request.headers["x-org-id"] as string | undefined;
      request.auth.userId = request.headers["x-user-id"] as string | undefined;
      request.auth.authMethod = request.auth.orgId ? "dev_header" : undefined;
    }
  });
};

// fp() breaks encapsulation so the hook applies to ALL routes
export const authPlugin = fp(authPluginImpl, { name: "auth" });

/**
 * Resolve the org_id for the current request.
 * Priority: auth context > query param > body param
 * In production, auth context is REQUIRED — query/body org_id must match.
 */
export function resolveRequestOrg(
  request: FastifyRequest,
  opts?: { fromQuery?: string; fromBody?: string }
): string {
  const authOrgId = request.auth?.orgId;
  const queryOrgId = opts?.fromQuery ?? (request.query as Record<string, string>)?.org_id;
  const bodyOrgId = opts?.fromBody ?? (request.body as Record<string, string>)?.org_id;
  const suppliedOrgId = queryOrgId || bodyOrgId;

  if (authOrgId) {
    if (suppliedOrgId && suppliedOrgId !== authOrgId) {
      throw new Error("org_id mismatch: supplied org_id does not match authenticated org");
    }
    return authOrgId;
  }

  if (suppliedOrgId) {
    return suppliedOrgId;
  }

  throw new Error("org_id required: authenticate via API key or session, or provide org_id");
}
