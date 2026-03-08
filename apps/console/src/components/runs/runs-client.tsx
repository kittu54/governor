"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSearch, Zap, AlertTriangle, DollarSign, Clock, Search, Filter } from "lucide-react";

interface Run {
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
}

interface RunsClientProps {
  orgId: string;
  runs: Run[];
}

const STATUS_OPTIONS = ["ALL", "RUNNING", "SUCCESS", "ERROR", "CANCELED"] as const;
const SOURCE_OPTIONS = ["ALL", "OPENAI", "ANTHROPIC", "GEMINI", "LANGCHAIN", "MCP", "CUSTOM"] as const;

export function RunsClient({ orgId, runs }: RunsClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return runs.filter((run) => {
      if (statusFilter !== "ALL" && run.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && run.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          run.id.toLowerCase().includes(q) ||
          run.agent_id.toLowerCase().includes(q) ||
          (run.model?.toLowerCase().includes(q) ?? false) ||
          (run.task_name?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [runs, search, statusFilter, sourceFilter]);

  const totalCost = filtered.reduce((sum, run) => sum + run.total_cost_usd, 0);
  const errored = filtered.filter((run) => run.status === "ERROR").length;
  const running = filtered.filter((run) => run.status === "RUNNING").length;
  const totalTokens = filtered.reduce((sum, run) => sum + run.total_input_tokens + run.total_output_tokens, 0);
  const runsWithDuration = filtered.filter(r => r.duration_ms);
  const avgDuration = runsWithDuration.length > 0
    ? runsWithDuration.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / runsWithDuration.length
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
                <p className="mt-2 text-3xl font-bold text-foreground">{filtered.length}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <FileSearch className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
                <p className="mt-2 text-3xl font-bold text-primary">{running}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Errors</p>
                <p className={`mt-2 text-3xl font-bold ${errored > 0 ? "text-red-400" : "text-emerald-400"}`}>{errored}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <AlertTriangle className={`h-5 w-5 ${errored > 0 ? "text-red-400" : "text-emerald-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Cost</p>
                <p className="mt-2 text-3xl font-bold text-foreground">${totalCost.toFixed(4)}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Duration</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : "-"}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tokens Summary */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Tokens Used</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalTokens.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">Input + output tokens across filtered runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cost per Run</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              ${filtered.length > 0 ? (totalCost / filtered.length).toFixed(4) : "0.0000"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Average cost per execution</p>
          </CardContent>
        </Card>
      </section>

      {/* Filters + Runs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>Cross-provider execution telemetry</CardDescription>
            </div>
            <Badge variant="secondary">{filtered.length} of {runs.length} runs</Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by run ID, agent, model, task..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>
                ))}
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
              >
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "ALL" ? "All Providers" : s}</option>
                ))}
              </select>
            </div>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <FileSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {runs.length === 0
                        ? "No runs recorded yet. Integrate the SDK to start capturing agent telemetry."
                        : "No runs match your filters. Try adjusting your search or filter criteria."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-muted-foreground">{new Date(run.started_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{run.id.slice(0, 16)}...</TableCell>
                    <TableCell>
                      <Link href={`/agents/${run.agent_id}?org_id=${encodeURIComponent(orgId)}` as Route} className="font-mono text-xs text-primary hover:underline">
                        {run.agent_id}
                      </Link>
                    </TableCell>
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
                      <Link href={`/runs/${run.id}?org_id=${encodeURIComponent(orgId)}` as Route} className="text-sm font-medium text-primary hover:underline">
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
