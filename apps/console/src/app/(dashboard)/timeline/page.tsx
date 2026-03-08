import { apiGet } from "@/lib/api-server";
import { TimelineClient } from "@/components/timeline/timeline-client";
import { resolveOrgId } from "@/lib/org";

interface TimelineResponse {
  events: Array<{
    id: string;
    timestamp: string;
    orgId: string;
    agentId: string;
    toolName: string;
    toolAction: string;
    decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
    status: "PENDING" | "SUCCESS" | "ERROR" | "DENIED" | "REQUIRES_APPROVAL";
    costEstimateUsd: number;
    latencyMs?: number | null;
    policyTrace?: Array<{ code: string; message: string }>;
  }>;
}

export default async function TimelinePage() {
  const resolvedOrgId = await resolveOrgId();

  const timeline = await apiGet<TimelineResponse>(`/v1/audit/events?org_id=${resolvedOrgId}&limit=100`).catch(() => ({ events: [] }));

  return <TimelineClient orgId={resolvedOrgId} initialEvents={timeline.events} />;
}
