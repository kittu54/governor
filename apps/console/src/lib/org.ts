import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkEnabled, isSupabaseEnabled } from "./clerk";

/**
 * Try to resolve the current org ID. Returns null if no org is selected.
 * Does NOT redirect — use for pages that handle the no-org state themselves.
 */
export async function tryResolveOrgId(): Promise<string | null> {
  if (isClerkEnabled) {
    try {
      const { orgId } = await auth();
      return orgId ?? null;
    } catch {
      return null;
    }
  }

  if (isSupabaseEnabled) {
    try {
      const { getSupabaseServerClient } = await import("./supabase-server");
      const supabase = await getSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      // Org from app_metadata, or derive from user ID
      const meta = user.app_metadata ?? {};
      return (meta.org_id as string) ?? (meta.organization_id as string) ?? `org_${user.id.slice(0, 8)}`;
    } catch {
      return null;
    }
  }

  return process.env.GOVERNOR_ORG_ID ?? null;
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
