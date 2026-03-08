import { PolicyStudioClient } from "@/components/policy/policy-studio-client";
import { PolicySetsClient } from "@/components/policy/policy-sets-client";
import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api";

interface PoliciesResponse {
  rules: Array<{
    id: string;
    orgId: string;
    agentId?: string | null;
    toolName: string;
    toolAction: string;
    effect: "ALLOW" | "DENY";
    priority: number;
    reason?: string | null;
  }>;
  thresholds: Array<{
    id: string;
    orgId: string;
    agentId?: string | null;
    toolName: string;
    toolAction: string;
    amountUsd: number;
  }>;
  budgets: Array<{
    id: string;
    orgId: string;
    agentId?: string | null;
    dailyLimitUsd: number;
  }>;
  rate_limits: Array<{
    id: string;
    orgId: string;
    agentId?: string | null;
    callsPerMinute: number;
  }>;
}

interface AgentsResponse {
  agents: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface V2PolicyItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  enforcement_mode: string;
  current_version_id: string | null;
  current_version_number: number | null;
  version_count: number;
  created_at: string;
}

interface V2PoliciesResponse {
  policies: V2PolicyItem[];
}

export default async function PolicyStudioPage() {
  const orgId = await resolveOrgId();
  const [policies, agentsData, v2Policies] = await Promise.all([
    apiGet<PoliciesResponse>(`/v1/policies?org_id=${orgId}`).catch(() => ({
      rules: [],
      thresholds: [],
      budgets: [],
      rate_limits: []
    })),
    apiGet<AgentsResponse>(`/v1/agents?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ agents: [] })),
    apiGet<V2PoliciesResponse>(`/v1/policies/v2?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ policies: [] })),
  ]);

  return (
    <div className="space-y-8">
      <PolicySetsClient orgId={orgId} initialPolicies={v2Policies.policies} />
      <div className="border-t border-border pt-8">
        <PolicyStudioClient orgId={orgId} initialPolicies={policies} agents={agentsData.agents} />
      </div>
    </div>
  );
}
