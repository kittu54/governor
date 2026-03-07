import { PolicyStudioClient } from "@/components/policy/policy-studio-client";
import { resolveOrgId } from "@/lib/org";

export default async function PolicyStudioPage() {
  const orgId = await resolveOrgId();
  return <PolicyStudioClient orgId={orgId} />;
}
