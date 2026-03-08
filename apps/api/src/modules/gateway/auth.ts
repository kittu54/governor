import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { FastifyRequest } from "fastify";

export function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = `gov_${Buffer.from(bytes).toString("base64url")}`;
  const prefix = raw.slice(0, 12);
  const hash = hashKey(raw);
  return { raw, prefix, hash };
}

export async function resolveApiKey(
  prisma: PrismaClient,
  request: FastifyRequest
): Promise<{ id: string; orgId: string; name: string; framework: string | null } | null> {
  const raw = extractRawKey(request);
  if (!raw) return null;

  const hash = hashKey(raw);

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash }
  });

  if (!key) return null;
  if (key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  return {
    id: key.id,
    orgId: key.orgId,
    name: key.name,
    framework: key.framework
  };
}

function extractRawKey(request: FastifyRequest): string | null {
  const headerKey = request.headers["x-governor-key"];
  if (typeof headerKey === "string" && headerKey.length > 0) {
    return headerKey;
  }

  const auth = request.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  return null;
}
