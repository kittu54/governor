import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";
import { ActionExplorerClient } from "@/components/actions/action-explorer-client";

export const metadata = { title: "Actions | Governor" };

export default async function ActionsPage() {
  const orgId = await resolveOrgId();

  const [actionsData, stats] = await Promise.all([
    apiGet<{ actions: unknown[]; total: number }>(
      `/v1/actions?org_id=${encodeURIComponent(orgId)}&limit=50`
    ).catch(() => ({ actions: [] as unknown[], total: 0 })),
    apiGet<any>(
      `/v1/actions/stats?org_id=${encodeURIComponent(orgId)}&period=24h`
    ).catch(() => null),
  ]);

  return (
    <ActionExplorerClient
      initialActions={actionsData.actions as any}
      initialTotal={actionsData.total}
      initialStats={stats}
      orgId={orgId}
    />
  );
}
