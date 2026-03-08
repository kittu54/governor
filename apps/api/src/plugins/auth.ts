import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { resolveApiKey } from "../modules/gateway/auth.js";

/** Track recently provisioned orgs to avoid repeated DB hits */
const provisionedOrgs = new Set<string>();

async function autoProvisionOrg(
  app: FastifyInstance,
  orgId: string,
  userId: string,
  orgRole?: string,
  orgSlug?: string
): Promise<void> {
  const cacheKey = `${orgId}:${userId}`;
  if (provisionedOrgs.has(cacheKey)) return;

  try {
    await app.prisma.organization.upsert({
      where: { id: orgId },
      create: {
        id: orgId,
        name: orgSlug ?? orgId,
        slug: orgSlug,
        plan: "free",
      },
      update: {},
    });

    await app.prisma.user.upsert({
      where: { orgId_email: { orgId, email: userId } },
      create: {
        id: userId,
        orgId,
        email: userId,
        role: orgRole === "admin" ? "owner" : "member",
      },
      update: {},
    });

    provisionedOrgs.add(cacheKey);

    if (provisionedOrgs.size > 10000) {
      const entries = [...provisionedOrgs];
      for (let i = 0; i < 5000; i++) provisionedOrgs.delete(entries[i]);
    }
  } catch (err) {
    app.log.warn({ err, orgId, userId }, "Auto-provision failed (non-fatal)");
  }
}

/**
 * Verify a Supabase-issued JWT (HS256) using the project's JWT secret.
 * Returns the decoded payload or null if verification fails.
 */
function verifySupabaseJwt(
  token: string,
  secret: string
): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const expectedSig = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();

  const actualSig = Buffer.from(signatureB64, "base64url");
  if (expectedSig.length !== actualSig.length) return null;
  if (!timingSafeEqual(expectedSig, actualSig)) return null;

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8")
  ) as Record<string, unknown>;

  // Check expiry
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

const authPluginImpl: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request) => {
    request.auth = {};

    const authHeader = request.headers.authorization;
    const governorKey = request.headers["x-governor-key"];

    // 1) API key auth (x-governor-key header)
    if (typeof governorKey === "string" && governorKey.length > 0) {
      const apiKey = await resolveApiKey(app.prisma, request);
      if (apiKey) {
        request.auth.orgId = apiKey.orgId;
        request.auth.apiKeyId = apiKey.id;
        request.auth.authMethod = "api_key";
        return;
      }
    }

    // 2) Bearer token — API key or Clerk JWT
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      if (token.startsWith("gov_")) {
        const apiKey = await resolveApiKey(app.prisma, request);
        if (apiKey) {
          request.auth.orgId = apiKey.orgId;
          request.auth.apiKeyId = apiKey.id;
          request.auth.authMethod = "api_key";
          return;
        }
      }

      // 2b) Supabase JWT (HS256)
      if (app.config.SUPABASE_JWT_SECRET) {
        try {
          const payload = verifySupabaseJwt(token, app.config.SUPABASE_JWT_SECRET);
          if (payload) {
            const userId = payload.sub as string | undefined;
            const email = payload.email as string | undefined;
            const appMeta = (payload.app_metadata ?? {}) as Record<string, unknown>;
            const orgId = (appMeta.org_id ?? appMeta.organization_id) as string | undefined;
            const orgRole = appMeta.org_role as string | undefined;

            request.auth.userId = userId;
            request.auth.orgId = orgId;
            request.auth.orgRole = orgRole;
            request.auth.authMethod = "supabase";

            if (orgId && userId) {
              await autoProvisionOrg(app, orgId, userId, orgRole, email);
            }
            return;
          }
        } catch {
          // Token invalid — fall through
        }
      }
    }

    // 3) Development-only fallback: trust x-org-id / x-user-id headers
    if (app.config.NODE_ENV !== "production") {
      request.auth.orgId = request.headers["x-org-id"] as string | undefined;
      request.auth.userId = request.headers["x-user-id"] as string | undefined;
      request.auth.authMethod = request.auth.orgId ? "dev_header" : undefined;
    }
  });
};

export const authPlugin = fp(authPluginImpl, { name: "auth" });

/**
 * Routes whose URL (without query string) can be accessed without authentication.
 * Checked by the production auth enforcement preHandler.
 */
export const PUBLIC_ROUTES = new Set([
  "/v1/billing/plans",
  "/v1/tools/risk-classes",
  "/health",
  "/ready",
]);

/**
 * Resolve the authenticated org_id for the current request.
 *
 * In production:
 *   - request.auth.orgId is REQUIRED (401 if missing)
 *   - If a supplied org_id (query/body) differs from auth: 403
 *
 * In development:
 *   - Falls back to supplied org_id if no auth context
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
      const err = new Error("org_id mismatch: supplied org_id does not match authenticated organization");
      (err as any).statusCode = 403;
      throw err;
    }
    return authOrgId;
  }

  const isProd = (request.server as any).config?.NODE_ENV === "production";

  if (isProd) {
    const err = new Error(
      "Authentication required. Provide an API key via x-governor-key header or a Bearer token via Authorization header."
    );
    (err as any).statusCode = 401;
    throw err;
  }

  // Development fallback: accept supplied org_id
  if (suppliedOrgId) {
    return suppliedOrgId;
  }

  const err = new Error(
    "org_id required: provide org_id query/body parameter, or authenticate via API key / Bearer token"
  );
  (err as any).statusCode = 400;
  throw err;
}

/**
 * Require that the request is authenticated (any method).
 * Does NOT require orgId — use for endpoints like onboarding/setup where
 * a Clerk-authenticated user may not yet have an org.
 */
export function requireAuthenticated(request: FastifyRequest): void {
  if (request.auth?.authMethod) return;

  const isProd = (request.server as any).config?.NODE_ENV === "production";
  if (!isProd) return;

  const err = new Error(
    "Authentication required. Provide an API key via x-governor-key header or a Bearer token via Authorization header."
  );
  (err as any).statusCode = 401;
  throw err;
}

/**
 * Convenience wrapper: require authentication AND resolve orgId in one call.
 * Returns the authenticated orgId or throws 401/403.
 */
export function requireOrgAuth(
  request: FastifyRequest,
  opts?: { fromQuery?: string; fromBody?: string }
): string {
  return resolveRequestOrg(request, opts);
}
