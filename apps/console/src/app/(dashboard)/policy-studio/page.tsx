import { PolicyStudioClient } from "@/components/policy/policy-studio-client";
import { PolicySetsClient } from "@/components/policy/policy-sets-client";
import { SimulationClient } from "@/components/policy/simulation-client";
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

interface VersionItem {
  id: string;
  version_number: number;
  checksum: string;
  is_published: boolean;
}

interface VersionsResponse {
  versions: VersionItem[];
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

  const allVersions: { id: string; version_number: number; checksum: string; is_published: boolean; policy_name?: string }[] = [];
  for (const p of v2Policies.policies) {
    if (p.version_count > 0) {
      const versionsData = await apiGet<VersionsResponse>(
        `/v1/policies/v2/${p.id}/versions?org_id=${encodeURIComponent(orgId)}`
      ).catch(() => ({ versions: [] }));
      for (const v of versionsData.versions) {
        allVersions.push({ ...v, policy_name: p.name });
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Policy Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create versioned policies, simulate impact, and manage real-time governance controls.
        </p>
      </div>

      <PolicySetsClient orgId={orgId} initialPolicies={v2Policies.policies} />

      <SimulationClient orgId={orgId} policyVersions={allVersions} />

      <div className="border-t border-border/50 pt-6">
        <PolicyStudioClient orgId={orgId} initialPolicies={policies} agents={agentsData.agents} />
      </div>
    </div>
  );
}
