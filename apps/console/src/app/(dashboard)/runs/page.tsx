import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api";
import { FileSearch, Zap, AlertTriangle, DollarSign, Clock } from "lucide-react";

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
  const running = data.runs.filter((run) => run.status === "RUNNING").length;
  const totalTokens = data.runs.reduce((sum, run) => sum + run.total_input_tokens + run.total_output_tokens, 0);
  const avgDuration = data.runs.filter(r => r.duration_ms).length > 0
    ? data.runs.filter(r => r.duration_ms).reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / data.runs.filter(r => r.duration_ms).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Runs</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{data.runs.length}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <FileSearch className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
            <p className="mt-2 text-3xl font-bold text-primary">{running}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Errors</p>
            <p className={`mt-2 text-3xl font-bold ${errored > 0 ? "text-red-400" : "text-emerald-400"}`}>{errored}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Cost</p>
            <p className="mt-2 text-3xl font-bold text-foreground">${totalCost.toFixed(4)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Duration</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : "-"}</p>
          </CardContent>
        </Card>
      </section>

      {/* Tokens Summary */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Tokens Used</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalTokens.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">Input + output tokens across all runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cost per Run</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              ${data.runs.length > 0 ? (totalCost / data.runs.length).toFixed(4) : "0.0000"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Average cost per execution</p>
          </CardContent>
        </Card>
      </section>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>Cross-provider execution telemetry</CardDescription>
            </div>
            <Badge variant="secondary">{data.runs.length} runs</Badge>
          </div>
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
                  <TableCell colSpan={8} className="py-12 text-center">
                    <FileSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No runs recorded yet. Integrate the SDK to start capturing agent telemetry.</p>
                  </TableCell>
                </TableRow>
              ) : (
                data.runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-muted-foreground">{new Date(run.started_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{run.id.slice(0, 12)}...</TableCell>
                    <TableCell className="font-mono text-xs">{run.agent_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">{run.source}</Badge>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{run.model ?? "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        run.status === "ERROR" ? "destructive" :
                        run.status === "SUCCESS" ? "success" :
                        run.status === "RUNNING" ? "default" : "secondary"
                      }>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{run.total_input_tokens}/{run.total_output_tokens}</span>
                    </TableCell>
                    <TableCell className="font-mono">${run.total_cost_usd.toFixed(4)}</TableCell>
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
