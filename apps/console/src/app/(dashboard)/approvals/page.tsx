import { apiGet } from "@/lib/api";
import { ApprovalsClient } from "@/components/approvals/approvals-client";
import { resolveOrgId } from "@/lib/org";

interface ApprovalsResponse {
  approvals: Array<{
    id: string;
    org_id: string;
    agent_id: string;
    agent_name?: string;
    agent_framework?: string;
    risk_class?: string | null;
    tool_name: string;
    tool_action: string;
    cost_estimate_usd: number;
    status: string;
    reason?: string | null;
    evidence?: unknown | null;
    requested_at: string;
    expires_at?: string | null;
    is_expired?: boolean;
    sla_remaining_seconds?: number | null;
    actions?: Array<{
      id: string;
      action: string;
      comment: string | null;
      created_at: string;
    }>;
  }>;
}

export default async function ApprovalsPage() {
  const resolvedOrgId = await resolveOrgId();

  const data = await apiGet<ApprovalsResponse>(
    `/v1/approvals?org_id=${resolvedOrgId}&limit=100`
  ).catch(() => ({ approvals: [] }));

  return <ApprovalsClient initialApprovals={data.approvals} orgId={resolvedOrgId} />;
}
