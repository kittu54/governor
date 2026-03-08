"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Zap, Search, Filter, ShieldCheck, ShieldAlert, ShieldX, Clock,
  ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ActionItem {
  id: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  agent_framework?: string;
  tool_name: string;
  tool_action: string;
  risk_class: string;
  risk_severity: number;
  decision: string;
  enforcement_mode: string;
  cost_estimate_usd: number;
  duration_ms?: number;
  approval_status?: string | null;
  approval_id?: string | null;
}

interface ActionStats {
  period: string;
  total: number;
  by_decision: { decision: string; count: number }[];
  by_risk_class: { risk_class: string; count: number }[];
  by_agent: { agent_id: string; count: number }[];
}

interface ActionExplorerProps {
  initialActions: ActionItem[];
  initialTotal: number;
  initialStats: ActionStats | null;
  orgId: string;
}

const RISK_VARIANTS: Record<string, "destructive" | "warning" | "default"> = {
  MONEY_MOVEMENT: "destructive",
  CODE_EXECUTION: "destructive",
  CREDENTIAL_USE: "destructive",
  ADMIN_ACTION: "destructive",
  EXTERNAL_COMMUNICATION: "warning",
  DATA_EXPORT: "warning",
  FILE_MUTATION: "warning",
  PII_ACCESS: "warning",
  DATA_WRITE: "default",
  LOW_RISK: "default",
};

const DECISION_COLORS: Record<string, string> = {
  ALLOW: "text-emerald-400",
  DENY: "text-red-400",
  REQUIRE_APPROVAL: "text-amber-400",
};

function decisionIcon(decision: string) {
  if (decision === "ALLOW") return <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />;
  if (decision === "DENY") return <ShieldX className="h-3.5 w-3.5 text-red-400" />;
  return <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />;
}

export function ActionExplorerClient({ initialActions, initialTotal, initialStats, orgId }: ActionExplorerProps) {
  const [actions, setActions] = useState(initialActions);
  const [total, setTotal] = useState(initialTotal);
  const [stats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [decisionFilter, setDecisionFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const pageSize = 50;

  const statCounts = useMemo(() => {
    if (!stats) return { allow: 0, deny: 0, approval: 0, total: 0 };
    const byDec = Object.fromEntries((stats.by_decision ?? []).map((d) => [d.decision, d.count]));
    return {
      allow: byDec.ALLOW ?? 0,
      deny: byDec.DENY ?? 0,
      approval: byDec.REQUIRE_APPROVAL ?? 0,
      total: stats.total ?? 0,
    };
  }, [stats]);

  async function reload(newPage = 0) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ org_id: orgId, limit: String(pageSize), offset: String(newPage * pageSize) });
      if (search) params.set("search", search);
      if (riskFilter !== "ALL") params.set("risk_class", riskFilter);
      if (decisionFilter !== "ALL") params.set("decision", decisionFilter);

      const res = await apiFetch(`/v1/actions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions ?? []);
        setTotal(data.total ?? 0);
        setPage(newPage);
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return actions.filter((a) => {
      if (riskFilter !== "ALL" && a.risk_class !== riskFilter) return false;
      if (decisionFilter !== "ALL" && a.decision !== decisionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.tool_name.toLowerCase().includes(q) ||
          a.tool_action.toLowerCase().includes(q) ||
          a.agent_name.toLowerCase().includes(q) ||
          a.agent_id.toLowerCase().includes(q) ||
          a.risk_class.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [actions, riskFilter, decisionFilter, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Action Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every tool invocation governed by the AI Action Firewall
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all ${decisionFilter === "ALL" ? "ring-1 ring-primary/50" : ""}`}
          onClick={() => { setDecisionFilter("ALL"); reload(); }}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Actions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{statCounts.total.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${decisionFilter === "ALLOW" ? "ring-1 ring-emerald-500/50" : ""}`}
          onClick={() => { setDecisionFilter(decisionFilter === "ALLOW" ? "ALL" : "ALLOW"); reload(); }}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Allowed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{statCounts.allow.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${decisionFilter === "DENY" ? "ring-1 ring-red-500/50" : ""}`}
          onClick={() => { setDecisionFilter(decisionFilter === "DENY" ? "ALL" : "DENY"); reload(); }}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Denied</p>
            <p className="mt-1 text-2xl font-bold text-red-400">{statCounts.deny.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${decisionFilter === "REQUIRE_APPROVAL" ? "ring-1 ring-amber-500/50" : ""}`}
          onClick={() => { setDecisionFilter(decisionFilter === "REQUIRE_APPROVAL" ? "ALL" : "REQUIRE_APPROVAL"); reload(); }}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Approval Required</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{statCounts.approval.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Actions
              </CardTitle>
              <CardDescription>All tool invocations evaluated by the governance engine</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => reload(page)} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search agent, tool, risk class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && reload(0)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={riskFilter}
                onChange={(e) => { setRiskFilter(e.target.value); reload(0); }}
                className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
              >
                <option value="ALL">All Risk Classes</option>
                <option value="MONEY_MOVEMENT">Money Movement</option>
                <option value="CODE_EXECUTION">Code Execution</option>
                <option value="EXTERNAL_COMMUNICATION">External Comm</option>
                <option value="DATA_EXPORT">Data Export</option>
                <option value="DATA_WRITE">Data Write</option>
                <option value="FILE_MUTATION">File Mutation</option>
                <option value="CREDENTIAL_USE">Credential Use</option>
                <option value="PII_ACCESS">PII Access</option>
                <option value="ADMIN_ACTION">Admin Action</option>
                <option value="LOW_RISK">Low Risk</option>
              </select>
              <select
                value={decisionFilter}
                onChange={(e) => { setDecisionFilter(e.target.value); reload(0); }}
                className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
              >
                <option value="ALL">All Decisions</option>
                <option value="ALLOW">Allowed</option>
                <option value="DENY">Denied</option>
                <option value="REQUIRE_APPROVAL">Approval Required</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center">
                    <Zap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {total === 0
                        ? "No actions yet. Actions appear when AI agents invoke tools through Governor."
                        : "No actions match your current filters."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((action) => (
                  <TableRow key={action.id} className="group">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {new Date(action.timestamp).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/agents/${action.agent_id}` as Route} className="text-primary hover:underline">
                        <span className="text-sm font-medium">{action.agent_name}</span>
                      </Link>
                      {action.agent_framework && (
                        <Badge variant="outline" className="ml-1.5 text-[9px]">{action.agent_framework}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {action.tool_name}<span className="text-muted-foreground">.{action.tool_action}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={RISK_VARIANTS[action.risk_class] ?? "default"} className="text-[10px]">
                        {action.risk_class.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {decisionIcon(action.decision)}
                        <span className={`text-xs font-medium ${DECISION_COLORS[action.decision] ?? "text-muted-foreground"}`}>
                          {action.decision === "REQUIRE_APPROVAL" ? "APPROVAL" : action.decision}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {action.approval_status ? (
                        <Badge
                          variant={
                            action.approval_status === "APPROVED" ? "success" :
                            action.approval_status === "DENIED" ? "destructive" :
                            action.approval_status === "PENDING" ? "warning" : "secondary"
                          }
                          className="text-[9px]"
                        >
                          {action.approval_status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      ${action.cost_estimate_usd.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {action.duration_ms != null ? `${action.duration_ms}ms` : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/actions/${action.id}` as Route}>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {total > pageSize && (
            <div className="flex items-center justify-between pt-4 border-t border-border/60 mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => reload(page - 1)} disabled={page === 0 || loading}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => reload(page + 1)} disabled={(page + 1) * pageSize >= total || loading}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
