import { verifyToken } from "@clerk/backend";
import type { FastifyPluginAsync } from "fastify";

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request) => {
    request.auth = {};

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      request.auth.orgId = request.headers["x-org-id"] as string | undefined;
      request.auth.userId = request.headers["x-user-id"] as string | undefined;
      return;
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!app.config.CLERK_SECRET_KEY || !app.config.CLERK_JWT_ISSUER) {
      request.auth.orgId = request.headers["x-org-id"] as string | undefined;
      request.auth.userId = request.headers["x-user-id"] as string | undefined;
      return;
    }

    try {
      const verified = await verifyToken(token, {
        secretKey: app.config.CLERK_SECRET_KEY,
        issuer: app.config.CLERK_JWT_ISSUER
      });

      request.auth.userId = verified.sub;
      request.auth.orgId = (verified as Record<string, unknown>).org_id as string | undefined;
    } catch {
      request.auth.orgId = request.headers["x-org-id"] as string | undefined;
      request.auth.userId = request.headers["x-user-id"] as string | undefined;
    }
  });
};
