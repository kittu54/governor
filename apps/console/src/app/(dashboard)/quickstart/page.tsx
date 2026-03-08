import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";
import { QuickstartClient } from "@/components/quickstart/quickstart-client";

export const metadata = { title: "Quickstart | Governor" };

export default async function QuickstartPage() {
  const orgId = await resolveOrgId();

  const [keysData, firewallStatus, agentsData, actionsData] = await Promise.all([
    apiGet<{ keys: unknown[] }>(`/v1/api-keys?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ keys: [] })),
    apiGet<{ enabled?: boolean }>(`/v1/firewall/status?org_id=${encodeURIComponent(orgId)}`).catch(() => null),
    apiGet<{ agents: unknown[] }>(`/v1/agents?org_id=${encodeURIComponent(orgId)}&limit=1`).catch(() => ({ agents: [] })),
    apiGet<{ total: number }>(`/v1/actions/stats?org_id=${encodeURIComponent(orgId)}&period=24h`).catch(() => ({ total: 0 })),
  ]);

  return (
    <QuickstartClient
      orgId={orgId}
      hasApiKey={keysData.keys.length > 0}
      firewallInstalled={!!firewallStatus?.enabled}
      agentCount={agentsData.agents.length}
      actionCount={actionsData.total}
    />
  );
}
