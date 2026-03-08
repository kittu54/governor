import { PolicyStudioClient } from "@/components/policy/policy-studio-client";
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

export default async function PolicyStudioPage() {
  const orgId = await resolveOrgId();
  const [policies, agentsData] = await Promise.all([
    apiGet<PoliciesResponse>(`/v1/policies?org_id=${orgId}`).catch(() => ({
      rules: [],
      thresholds: [],
      budgets: [],
      rate_limits: []
    })),
    apiGet<AgentsResponse>(`/v1/agents?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ agents: [] }))
  ]);

  return <PolicyStudioClient orgId={orgId} initialPolicies={policies} agents={agentsData.agents} />;
}
