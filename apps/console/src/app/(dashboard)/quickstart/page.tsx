import { tryResolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";
import { QuickstartClient } from "@/components/quickstart/quickstart-client";
import { SelectOrgPrompt } from "@/components/quickstart/select-org-prompt";

export const metadata = { title: "Quickstart | Governor" };

export default async function QuickstartPage() {
  const orgId = await tryResolveOrgId();

  if (!orgId) {
    return <SelectOrgPrompt />;
  }

  const [keysData, firewallStatus, agentsData, actionsData] = await Promise.all([
    apiGet<{ keys: unknown[] }>(`/v1/api-keys`).catch(() => ({ keys: [] })),
    apiGet<{ enabled?: boolean }>(`/v1/firewall/status`).catch(() => null),
    apiGet<{ agents: unknown[] }>(`/v1/agents?limit=1`).catch(() => ({ agents: [] })),
    apiGet<{ total: number }>(`/v1/actions/stats?period=24h`).catch(() => ({ total: 0 })),
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
