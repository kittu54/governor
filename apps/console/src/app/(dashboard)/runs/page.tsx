import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api";

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
  const data = await apiGet<RunsResponse>(`/v1/runs?org_id=${orgId}&limit=200`).catch(() => ({ runs: [] }));

  const totalCost = data.runs.reduce((sum, run) => sum + run.total_cost_usd, 0);
  const errored = data.runs.filter((run) => run.status === "ERROR").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run Explorer</CardTitle>
          <CardDescription>Cross-provider execution telemetry across OpenAI, Claude, Gemini, LangChain, MCP, and custom agents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <Metric label="Runs" value={String(data.runs.length)} />
            <Metric label="Errored" value={String(errored)} />
            <Metric label="Run Cost" value={`$${totalCost.toFixed(4)}`} />
            <Metric label="Org" value={orgId} mono />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Run</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Provider / Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No runs recorded yet. Integrate the SDK to start capturing agent telemetry.
                  </TableCell>
                </TableRow>
              ) : (
                data.runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{new Date(run.started_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{run.id}</TableCell>
                    <TableCell className="font-mono text-xs">{run.agent_id}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{run.source}</p>
                      <p className="font-mono text-xs">{run.provider ?? "unknown"}.{run.model ?? "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={run.status === "ERROR" ? "destructive" : run.status === "SUCCESS" ? "default" : "secondary"}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{run.total_input_tokens}/{run.total_output_tokens}</span>
                    </TableCell>
                    <TableCell>${run.total_cost_usd.toFixed(4)}</TableCell>
                    <TableCell>
                      <Link href={`/runs/${run.id}` as Route} className="text-sm font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
