import { auth } from "@clerk/nextjs/server";
import { isClerkEnabled } from "./clerk";

export async function resolveOrgId() {
  const fallbackOrgId = process.env.GOVERNOR_ORG_ID ?? "org_demo_1";

  if (!isClerkEnabled) {
    return fallbackOrgId;
  }

  const { orgId } = await auth();
  return orgId ?? fallbackOrgId;
}
