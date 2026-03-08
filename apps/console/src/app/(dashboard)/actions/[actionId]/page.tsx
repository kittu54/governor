import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";
import { ActionReviewClient } from "@/components/actions/action-review-client";

export const metadata = { title: "Action Review | Governor" };

export default async function ActionReviewPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId } = await params;
  const orgId = await resolveOrgId();

  const action = await apiGet<any>(
    `/v1/actions/${encodeURIComponent(actionId)}?org_id=${encodeURIComponent(orgId)}`
  ).catch(() => null);

  return <ActionReviewClient action={action} orgId={orgId} />;
}
