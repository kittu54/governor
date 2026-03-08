import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api";
import { RunsClient } from "@/components/runs/runs-client";

interface RunsResponse {
  runs: Array<{
    id: string;
    org_id: string;
    agent_id: string;
    source: "OPENAI" | "ANTHROPIC" | "GEMINI" | "LANGCHAIN" | "MCP" | "CUSTOM";
    provider?: string | null;
    model?: string | null;
    task_name?: string | null;
    status: "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";
    started_at: string;
    duration_ms?: number | null;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    total_tool_calls: number;
    risk_score?: number | null;
  }>;
}

export default async function RunsPage() {
  const orgId = await resolveOrgId();
  const data = await apiGet<RunsResponse>(`/v1/runs?org_id=${encodeURIComponent(orgId)}&limit=200`).catch(() => ({ runs: [] }));

  return <RunsClient orgId={orgId} runs={data.runs} />;
}
