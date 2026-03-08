import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * Compute a SHA-256 hash of the audit entry content concatenated with the previous hash.
 */
export function computeAuditHash(
  entry: {
    id: string;
    orgId: string;
    eventType: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    createdAt: Date;
  },
  previousHash: string | null,
): string {
  const canonical = JSON.stringify({
    id: entry.id,
    org_id: entry.orgId,
    event_type: entry.eventType,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    summary: entry.summary,
    created_at: entry.createdAt.toISOString(),
    previous_hash: previousHash ?? "GENESIS",
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Get the last audit log's checksum for an org (used as previous_hash for the next entry).
 */
export async function getLastAuditHash(
  prisma: PrismaClient,
  orgId: string,
): Promise<string | null> {
  const last = await prisma.auditLog.findFirst({
    where: { orgId, checksum: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { checksum: true },
  });
  return last?.checksum ?? null;
}

/**
 * Verify the integrity of the audit chain for an org.
 * Returns the verification result with details.
 */
export async function verifyAuditChain(
  prisma: PrismaClient,
  orgId: string,
  limit = 1000,
): Promise<{
  verified: boolean;
  total_checked: number;
  first_broken_at?: string;
  details: string;
}> {
  const entries = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      orgId: true,
      eventType: true,
      entityType: true,
      entityId: true,
      summary: true,
      checksum: true,
      previousHash: true,
      createdAt: true,
    },
  });

  if (entries.length === 0) {
    return { verified: true, total_checked: 0, details: "No audit entries found" };
  }

  let unchained = 0;
  let broken = 0;
  let firstBroken: string | undefined;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (!entry.checksum) {
      unchained += 1;
      continue;
    }

    const expectedPrevHash = i === 0 ? null : entries[i - 1].checksum ?? null;
    const expectedHash = computeAuditHash(entry, entry.previousHash ?? null);

    if (entry.checksum !== expectedHash) {
      broken += 1;
      if (!firstBroken) firstBroken = entry.id;
    }

    if (entry.previousHash !== null && entry.previousHash !== expectedPrevHash) {
      broken += 1;
      if (!firstBroken) firstBroken = entry.id;
    }
  }

  const verified = broken === 0;
  const details = verified
    ? `${entries.length} entries verified (${unchained} without checksum)`
    : `Chain broken: ${broken} integrity failure(s) in ${entries.length} entries`;

  return {
    verified,
    total_checked: entries.length,
    first_broken_at: firstBroken,
    details,
  };
}
