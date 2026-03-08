import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import { AgentDetailClient } from "@/components/agents/agent-detail-client";
import { notFound } from "next/navigation";

interface AgentDetailResponse {
  agent: {
    id: string;
    orgId: string;
    name: string;
    description?: string | null;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    framework?: string | null;
    tags?: string[] | null;
    allowedTools?: Array<{ tool_name: string; tool_action: string }> | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    stats: {
      total_runs: number;
      total_audit_events: number;
      pending_approvals: number;
    };
  };
  policies: {
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
    thresholds: Array<{ id: string; agentId?: string | null; toolName: string; toolAction: string; amountUsd: number }>;
    budgets: Array<{ id: string; agentId?: string | null; dailyLimitUsd: number }>;
    rateLimits: Array<{ id: string; agentId?: string | null; callsPerMinute: number }>;
  };
  recentRuns: Array<{
    id: string;
    status: string;
    source: string;
    provider?: string | null;
    model?: string | null;
    taskName?: string | null;
    startedAt: string;
    durationMs?: number | null;
    totalCostUsd: number;
    totalToolCalls: number;
  }>;
}

export default async function AgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const orgId = await resolveOrgId();

  const data = await apiGet<AgentDetailResponse>(
    `/v1/agents/${encodeURIComponent(agentId)}?org_id=${encodeURIComponent(orgId)}`
  ).catch(() => null);

  if (!data) {
    notFound();
  }

  return <AgentDetailClient orgId={orgId} data={data} />;
}
