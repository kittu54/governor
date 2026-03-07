import { apiGet } from "@/lib/api";
import { RunDetailClient } from "@/components/runs/run-detail-client";
import { resolveOrgId } from "@/lib/org";

interface RunDetailResponse {
  run: {
    id: string;
    org_id: string;
    agent_id: string;
    source: string;
    provider?: string | null;
    model?: string | null;
    framework?: string | null;
    runtime?: string | null;
    task_name?: string | null;
    status: "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";
    started_at: string;
    ended_at?: string | null;
    duration_ms?: number | null;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    total_tool_calls: number;
    error_message?: string | null;
    risk_score?: number | null;
    tags?: string[];
    metadata?: Record<string, unknown> | null;
  };
  summary: {
    event_count: number;
    event_type_breakdown: Record<string, number>;
    avg_event_latency_ms: number;
    top_cost_events: Array<{
      type: string;
      step_name?: string | null;
      tool_name?: string | null;
      cost_usd: number;
      timestamp: string;
    }>;
  };
  analysis: {
    insights: string[];
    recommendations: string[];
  };
  events: Array<{
    id: string;
    timestamp: string;
    type: string;
    provider?: string | null;
    model?: string | null;
    step_name?: string | null;
    tool_name?: string | null;
    tool_action?: string | null;
    input_tokens?: number | null;
    output_tokens?: number | null;
    cost_usd: number;
    latency_ms?: number | null;
    status?: string | null;
    error_message?: string | null;
    input_payload?: Record<string, unknown> | null;
    output_payload?: Record<string, unknown> | null;
    parameters?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }>;
}

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  const orgId = await resolveOrgId();

  const data = await apiGet<RunDetailResponse>(`/v1/runs/${runId}?org_id=${encodeURIComponent(orgId)}`).catch(() => null);

  if (!data) {
    return (
      <div className="rounded-lg border bg-white/80 p-6">
        <p className="text-sm text-muted-foreground">Run not found or API unavailable.</p>
      </div>
    );
  }

  return <RunDetailClient runId={runId} orgId={orgId} data={data} />;
}
