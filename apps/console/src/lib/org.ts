import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkEnabled } from "./clerk";

/**
 * Try to resolve the current org ID. Returns null if no org is selected.
 * Does NOT redirect — use for pages that handle the no-org state themselves.
 */
export async function tryResolveOrgId(): Promise<string | null> {
  if (!isClerkEnabled) {
    return process.env.GOVERNOR_ORG_ID ?? null;
  }

  try {
    const { orgId } = await auth();
    return orgId ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve the current org ID. Redirects to /quickstart if no org is available.
 * Use for pages that require an org context.
 */
export async function resolveOrgId(): Promise<string> {
  const orgId = await tryResolveOrgId();
  if (!orgId) {
    redirect("/quickstart");
  }
  return orgId;
}
