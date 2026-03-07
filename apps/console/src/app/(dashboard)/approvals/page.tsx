import { apiGet } from "@/lib/api";
import { ApprovalsClient } from "@/components/approvals/approvals-client";
import { resolveOrgId } from "@/lib/org";

interface ApprovalsResponse {
  approvals: Array<{
    id: string;
    orgId: string;
    agentId: string;
    userId?: string | null;
    toolName: string;
    toolAction: string;
    costEstimateUsd: number;
    status: "PENDING" | "APPROVED" | "DENIED";
    requestedAt: string;
  }>;
}

export default async function ApprovalsPage() {
  const resolvedOrgId = await resolveOrgId();

  const data = await apiGet<ApprovalsResponse>(`/v1/approvals?org_id=${resolvedOrgId}&limit=100`).catch(() => ({ approvals: [] }));

  return <ApprovalsClient initialApprovals={data.approvals} orgId={resolvedOrgId} />;
}
