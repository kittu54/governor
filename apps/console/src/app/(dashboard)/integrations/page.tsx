import { apiGet, API_BASE_URL } from "@/lib/api-server";
import { resolveOrgId } from "@/lib/org";
import { IntegrationsClient } from "@/components/integrations/integrations-client";

interface KeysResponse {
  keys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    framework?: string | null;
    lastUsedAt?: string | null;
    expiresAt?: string | null;
    revokedAt?: string | null;
    createdAt: string;
  }>;
}

interface FrameworksResponse {
  frameworks: Array<{
    framework: string;
    agents: number;
    active_agents: number;
    tool_calls: number;
    runs: number;
    cost_usd: number;
    denied: number;
    allowed: number;
    approval_required: number;
    block_rate: number;
    api_keys: number;
  }>;
}

export default async function IntegrationsPage() {
  const orgId = await resolveOrgId();

  const [keysData, frameworksData] = await Promise.all([
    apiGet<KeysResponse>(`/v1/api-keys?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ keys: [] })),
    apiGet<FrameworksResponse>(`/v1/metrics/frameworks?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ frameworks: [] }))
  ]);

  return (
    <IntegrationsClient
      orgId={orgId}
      apiBaseUrl={API_BASE_URL}
      initialKeys={keysData.keys}
      frameworks={frameworksData.frameworks}
    />
  );
}
