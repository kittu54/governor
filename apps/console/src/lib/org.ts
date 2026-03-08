import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkEnabled } from "./clerk";

export async function resolveOrgId(): Promise<string> {
  if (!isClerkEnabled) {
    const envOrgId = process.env.GOVERNOR_ORG_ID;
    if (!envOrgId) {
      redirect("/quickstart");
    }
    return envOrgId;
  }

  const { orgId } = await auth();
  if (!orgId) {
    redirect("/quickstart");
  }
  return orgId;
}
