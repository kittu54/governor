import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import { AgentsClient } from "@/components/agents/agents-client";

interface AgentsResponse {
  agents: Array<{
    id: string;
    orgId: string;
    name: string;
    description?: string | null;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    framework?: string | null;
    tags?: string[] | null;
    allowedTools?: Array<{ tool_name: string; tool_action: string }> | null;
    createdAt: string;
    stats?: {
      total_runs: number;
      total_audit_events: number;
      pending_approvals: number;
    };
  }>;
}

export default async function AgentsPage() {
  const orgId = await resolveOrgId();
  const data = await apiGet<AgentsResponse>(`/v1/agents?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ agents: [] }));

  return <AgentsClient initialAgents={data.agents} orgId={orgId} />;
}
