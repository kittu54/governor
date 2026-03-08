"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Bot, Pencil, Save, X, Loader2,
  ShieldCheck, AlertTriangle, Wallet, Gauge, Layers, Clock
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PolicyRule {
  id: string;
  orgId: string;
  agentId?: string | null;
  toolName: string;
  toolAction: string;
  effect: "ALLOW" | "DENY";
  priority: number;
  reason?: string | null;
}

interface Run {
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
}

interface AgentDetailData {
  agent: {
    id: string;
    orgId: string;
    name: string;
    description?: string | null;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    framework?: string | null;
    environment?: string | null;
    provider?: string | null;
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
    rules: PolicyRule[];
    thresholds: Array<{ id: string; agentId?: string | null; toolName: string; toolAction: string; amountUsd: number }>;
    budgets: Array<{ id: string; agentId?: string | null; dailyLimitUsd: number }>;
    rateLimits: Array<{ id: string; agentId?: string | null; callsPerMinute: number }>;
  };
  recentRuns: Run[];
}

interface AgentDetailClientProps {
  orgId: string;
  data: AgentDetailData;
}

export function AgentDetailClient({ orgId, data }: AgentDetailClientProps) {
  const [agent, setAgent] = useState(data.agent);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    name: agent.name,
    description: agent.description ?? "",
    status: agent.status,
    tags: (Array.isArray(agent.tags) ? agent.tags : []).join(", "),
    allowedTools: (Array.isArray(agent.allowedTools) ? agent.allowedTools : [])
      .map(t => `${t.tool_name}.${t.tool_action}`).join("\n")
  });

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave() {
    startTransition(async () => {
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const allowedTools = form.allowedTools.split("\n").map(l => l.trim()).filter(Boolean)
        .map(line => {
          const [tool_name, tool_action = "*"] = line.split(".");
          return { tool_name: tool_name.trim(), tool_action: tool_action.trim() };
        });

      const response = await apiFetch(`/v1/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          status: form.status,
          tags,
          allowed_tools: allowedTools
        })
      });

      if (!response.ok) {
        showToast("Failed to update agent", "error");
        return;
      }

      const updated = await response.json();
      setAgent(prev => ({ ...prev, ...updated }));
      setEditing(false);
      showToast("Agent updated");
    });
  }

  const agentRules = data.policies.rules.filter(r => r.agentId === agent.id);
  const orgRules = data.policies.rules.filter(r => !r.agentId);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error"
            ? "border-red-500/30 bg-red-950/80 text-red-300"
            : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={"/agents" as Route} className="rounded-lg border border-border bg-muted p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
              <Badge variant={agent.status === "ACTIVE" ? "success" : agent.status === "SUSPENDED" ? "destructive" : "secondary"}>
                {agent.status}
              </Badge>
              {agent.framework && (
                <Badge variant="outline" className="capitalize">{agent.framework}</Badge>
              )}
              {agent.environment && (
                <Badge variant={agent.environment === "PROD" ? "destructive" : agent.environment === "STAGING" ? "warning" : "secondary"}>
                  {agent.environment}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-muted-foreground">{agent.id}</p>
              {agent.provider && (
                <span className="text-xs text-muted-foreground">· Provider: <span className="font-medium text-foreground">{agent.provider}</span></span>
              )}
            </div>
            {agent.description && <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>}
          </div>
        </div>
        <Button
          variant={editing ? "ghost" : "outline"}
          size="sm"
          onClick={() => setEditing(!editing)}
        >
          {editing ? <><X className="mr-2 h-4 w-4" /> Cancel</> : <><Pencil className="mr-2 h-4 w-4" /> Edit Agent</>}
        </Button>
      </div>

      {/* Edit Form */}
      {editing && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Edit Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED" }))}
                  className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Allowed Tools (one per line: tool.action)</Label>
                <Textarea value={form.allowedTools} onChange={(e) => setForm(f => ({ ...f, allowedTools: e.target.value }))} rows={3} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={isPending} size="sm" className="mt-4">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Runs</p>
            <p className="mt-1 text-2xl font-bold text-primary">{agent.stats.total_runs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Audit Events</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{agent.stats.total_audit_events}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{agent.stats.pending_approvals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Allowed Tools</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {Array.isArray(agent.allowedTools) ? agent.allowedTools.length : 0}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Tags + Allowed Tools */}
      {((Array.isArray(agent.tags) && agent.tags.length > 0) || (Array.isArray(agent.allowedTools) && agent.allowedTools.length > 0)) && (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.isArray(agent.tags) && agent.tags.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {agent.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
          {Array.isArray(agent.allowedTools) && agent.allowedTools.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Allowed Tools</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {agent.allowedTools.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <span className="font-mono text-sm text-foreground">{t.tool_name}</span>
                      <span className="text-muted-foreground">.</span>
                      <span className="font-mono text-sm text-primary">{t.tool_action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Linked Policies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <CardTitle>Applicable Policies</CardTitle>
                <CardDescription>Rules, thresholds, budgets, and rate limits that apply to this agent.</CardDescription>
              </div>
            </div>
            <Link href={"/policy-studio" as Route} className="text-sm text-primary hover:underline">
              Manage in Policy Studio
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rules */}
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Rules ({data.policies.rules.length})
              </h4>
              {data.policies.rules.length === 0 ? (
                <p className="text-xs text-muted-foreground">No rules configured.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.policies.rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.effect === "DENY" ? "destructive" : "success"} className="text-[10px]">{rule.effect}</Badge>
                        <span className="font-mono text-xs">{rule.toolName}.{rule.toolAction}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>p{rule.priority}</span>
                        {rule.agentId ? <Badge variant="outline" className="text-[9px]">agent</Badge> : <Badge variant="outline" className="text-[9px]">org</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thresholds + Budgets + Rate Limits */}
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" /> Thresholds ({data.policies.thresholds.length})
                </h4>
                {data.policies.thresholds.map((t) => (
                  <div key={t.id} className="mb-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{t.toolName}.{t.toolAction}</span>
                    <span className="ml-2 text-amber-400">&gt; ${t.amountUsd}</span>
                  </div>
                ))}
                {data.policies.thresholds.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Wallet className="h-3.5 w-3.5" /> Budgets ({data.policies.budgets.length})
                </h4>
                {data.policies.budgets.map((b) => (
                  <div key={b.id} className="mb-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{b.agentId ?? "org-wide"}</span>
                    <span className="ml-2 text-foreground">${b.dailyLimitUsd}/day</span>
                  </div>
                ))}
                {data.policies.budgets.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Gauge className="h-3.5 w-3.5" /> Rate Limits ({data.policies.rateLimits.length})
                </h4>
                {data.policies.rateLimits.map((r) => (
                  <div key={r.id} className="mb-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{r.agentId ?? "org-wide"}</span>
                    <span className="ml-2 text-foreground">{r.callsPerMinute}/min</span>
                  </div>
                ))}
                {data.policies.rateLimits.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <div>
                <CardTitle>Recent Runs</CardTitle>
                <CardDescription>Latest execution telemetry for this agent.</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">{data.recentRuns.length} runs</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentRuns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No runs recorded for this agent.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{run.id.slice(0, 12)}...</TableCell>
                    <TableCell className="text-sm">{run.taskName ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">{run.source}</Badge>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{run.model ?? "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={run.status === "ERROR" ? "destructive" : run.status === "SUCCESS" ? "success" : "default"}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">${run.totalCostUsd.toFixed(4)}</TableCell>
                    <TableCell className="text-muted-foreground">{run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "-"}</TableCell>
                    <TableCell>
                      <Link href={`/runs/${run.id}` as Route} className="text-sm text-primary hover:underline">
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
