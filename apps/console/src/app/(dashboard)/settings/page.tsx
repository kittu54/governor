import { resolveOrgId } from "@/lib/org";
import { apiGet, API_BASE_URL } from "@/lib/api-server";
import { UnifiedSettingsClient } from "@/components/settings/unified-settings-client";

export const metadata = { title: "Settings | Governor" };

interface UsageData {
  plan: string;
  actions_this_month: number;
  evaluations_this_month: number;
  actions_limit: number | null;
  usage_percentage: number;
  billing_email: string | null;
  current_period: string;
}

interface PlansData {
  plans: Array<{
    id: string;
    name: string;
    actions_per_month: number | null;
    price_usd: number | null;
    features: string[];
  }>;
}

interface AgentsResponse {
  agents: Array<{ id: string; name: string; status: string }>;
}

interface OverviewResponse {
  kpis: {
    tool_calls: number;
    blocked_pct: number;
    pending_approvals: number;
    estimated_cost_usd: number;
  };
}

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

export default async function SettingsPage() {
  const orgId = await resolveOrgId();
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const [usage, plans, agents, overview, keys] = await Promise.all([
    apiGet<UsageData>(`/v1/billing/usage?org_id=${encodeURIComponent(orgId)}`).catch(() => null),
    apiGet<PlansData>("/v1/billing/plans").catch(() => ({ plans: [] })),
    apiGet<AgentsResponse>(`/v1/agents?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ agents: [] })),
    apiGet<OverviewResponse>(`/v1/metrics/overview?org_id=${orgId}`).catch(() => ({
      kpis: { tool_calls: 0, blocked_pct: 0, pending_approvals: 0, estimated_cost_usd: 0 },
    })),
    apiGet<KeysResponse>(`/v1/api-keys?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ keys: [] })),
  ]);

  return (
    <UnifiedSettingsClient
      orgId={orgId}
      apiBaseUrl={API_BASE_URL}
      clerkEnabled={clerkEnabled}
      usage={usage}
      plans={plans.plans}
      agents={agents.agents}
      overview={overview.kpis}
      apiKeys={keys.keys}
    />
  );
}
