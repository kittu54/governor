import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallsCostChart } from "@/components/charts/calls-cost-chart";
import { DecisionPieChart } from "@/components/charts/decision-pie-chart";
import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import {
  Activity, ShieldAlert, Clock, DollarSign, TrendingUp, TrendingDown,
  ArrowRight, Bot, Layers, ShieldCheck, AlertTriangle, Shield,
} from "lucide-react";

interface OverviewResponse {
  kpis: {
    tool_calls: number;
    blocked_pct: number;
    pending_approvals: number;
    estimated_cost_usd: number;
  };
  calls_series: Array<{ date: string; calls: number; cost: number }>;
  decision_breakdown: Array<{ decision: string; value: number }>;
}

interface AgentsResponse {
  agents: Array<{
    id: string;
    name: string;
    orgId: string;
    status?: string;
    description?: string | null;
    framework?: string;
    environment?: string;
    stats?: {
      total_runs: number;
      total_audit_events: number;
      pending_approvals: number;
    };
  }>;
}

interface RiskClassMetric {
  risk_class: string;
  total: number;
  denied: number;
  allowed: number;
  approval: number;
  cost: number;
  block_rate: number;
}

interface CostsResponse {
  summary: {
    total_governed_cost_usd: number;
    total_blocked_cost_usd: number;
    total_run_cost_usd: number;
  };
}

const fallback: OverviewResponse = {
  kpis: { tool_calls: 0, blocked_pct: 0, pending_approvals: 0, estimated_cost_usd: 0 },
  calls_series: [],
  decision_breakdown: [
    { decision: "ALLOW", value: 0 },
    { decision: "DENY", value: 0 },
    { decision: "REQUIRE_APPROVAL", value: 0 }
  ]
};

const RISK_SEVERITY: Record<string, { label: string; color: string; bgColor: string }> = {
  MONEY_MOVEMENT:         { label: "Money Movement",         color: "text-red-400",    bgColor: "bg-red-500/15" },
  CODE_EXECUTION:         { label: "Code Execution",         color: "text-red-400",    bgColor: "bg-red-500/15" },
  ADMIN_ACTION:           { label: "Admin Action",           color: "text-red-400",    bgColor: "bg-red-500/15" },
  CREDENTIAL_USE:         { label: "Credential Use",         color: "text-red-400",    bgColor: "bg-red-500/15" },
  EXTERNAL_COMMUNICATION: { label: "External Comms",         color: "text-amber-400",  bgColor: "bg-amber-500/15" },
  DATA_EXPORT:            { label: "Data Export",            color: "text-amber-400",  bgColor: "bg-amber-500/15" },
  DATA_WRITE:             { label: "Data Write",             color: "text-amber-400",  bgColor: "bg-amber-500/15" },
  PII_ACCESS:             { label: "PII Access",             color: "text-amber-400",  bgColor: "bg-amber-500/15" },
  FILE_MUTATION:           { label: "File Mutation",          color: "text-amber-400",  bgColor: "bg-amber-500/15" },
  LOW_RISK:               { label: "Low Risk",               color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
};

export default async function OverviewPage() {
  const orgId = await resolveOrgId();
  const [overview, agents, riskMetrics, costs] = await Promise.all([
    apiGet<OverviewResponse>(`/v1/metrics/overview?org_id=${orgId}`).catch(() => fallback),
    apiGet<AgentsResponse>(`/v1/agents?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ agents: [] })),
    apiGet<{ risk_classes: RiskClassMetric[] }>(`/v1/metrics/risk-classes?org_id=${orgId}`).catch(() => ({ risk_classes: [] })),
    apiGet<CostsResponse>(`/v1/metrics/costs?org_id=${orgId}`).catch(() => ({ summary: { total_governed_cost_usd: 0, total_blocked_cost_usd: 0, total_run_cost_usd: 0 } })),
  ]);

  const totalDecisions = overview.decision_breakdown.reduce((sum, d) => sum + d.value, 0);
  const allowRate = totalDecisions > 0
    ? ((overview.decision_breakdown.find(d => d.decision === "ALLOW")?.value ?? 0) / totalDecisions * 100)
    : 0;

  const avgDailyCost = overview.calls_series.length > 0
    ? overview.calls_series.reduce((sum, d) => sum + d.cost, 0) / overview.calls_series.length
    : 0;

  const costTrend = overview.calls_series.length >= 2
    ? overview.calls_series[overview.calls_series.length - 1].cost - overview.calls_series[overview.calls_series.length - 2].cost
    : 0;

  const cards = [
    {
      label: "Tool Calls",
      value: overview.kpis.tool_calls.toLocaleString(),
      icon: Activity,
      trend: overview.kpis.tool_calls > 0 ? "active" : "idle",
      color: "text-primary"
    },
    {
      label: "Blocked Rate",
      value: `${overview.kpis.blocked_pct.toFixed(1)}%`,
      icon: ShieldAlert,
      trend: overview.kpis.blocked_pct > 15 ? "high" : "normal",
      color: overview.kpis.blocked_pct > 15 ? "text-red-400" : "text-emerald-400"
    },
    {
      label: "Pending Approvals",
      value: overview.kpis.pending_approvals.toLocaleString(),
      icon: Clock,
      trend: overview.kpis.pending_approvals > 5 ? "attention" : "clear",
      color: overview.kpis.pending_approvals > 5 ? "text-amber-400" : "text-primary",
      href: "/approvals" as Route
    },
    {
      label: "Estimated Cost",
      value: `$${overview.kpis.estimated_cost_usd.toFixed(2)}`,
      icon: DollarSign,
      trend: overview.kpis.estimated_cost_usd > 100 ? "high" : "normal",
      color: "text-primary"
    }
  ];

  const totalRiskEvals = riskMetrics.risk_classes.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const inner = (
            <Card key={card.label} className={`overflow-hidden transition-colors ${card.href ? "hover:border-primary/40" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2.5">
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {card.trend === "high" || card.trend === "attention" ? (
                    <TrendingUp className="h-3 w-3 text-amber-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-emerald-400" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {card.trend === "high" ? "Above threshold" : card.trend === "attention" ? "Needs review" : "Within limits"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </section>

      {/* Quick Stats Row */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Allow Rate</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{allowRate.toFixed(1)}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500/70 transition-all" style={{ width: `${Math.min(allowRate, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Governed Cost</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${costs.summary.total_governed_cost_usd.toFixed(2)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              ${costs.summary.total_blocked_cost_usd.toFixed(2)} blocked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Daily Cost</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${avgDailyCost.toFixed(2)}</p>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {costTrend > 0 ? (
                <><TrendingUp className="h-3 w-3 text-red-400" /><span className="text-red-400">+${costTrend.toFixed(2)} vs prior day</span></>
              ) : costTrend < 0 ? (
                <><TrendingDown className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">${costTrend.toFixed(2)} vs prior day</span></>
              ) : (
                <span className="text-muted-foreground">Over the last {overview.calls_series.length} days</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Risk Class Distribution */}
      {riskMetrics.risk_classes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Risk Class Distribution
                </CardTitle>
                <CardDescription>{totalRiskEvals} total evaluations across {riskMetrics.risk_classes.length} risk classes</CardDescription>
              </div>
              <Link href={"/tools" as Route} className="flex items-center gap-1 text-sm text-primary hover:underline">
                Tool Registry <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {riskMetrics.risk_classes.map(rc => {
                const meta = RISK_SEVERITY[rc.risk_class] ?? { label: rc.risk_class, color: "text-foreground", bgColor: "bg-muted" };
                return (
                  <div key={rc.risk_class} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <div className={`rounded p-1.5 ${meta.bgColor}`}>
                        <AlertTriangle className={`h-3.5 w-3.5 ${meta.color}`} />
                      </div>
                      <span className="text-sm font-medium">{meta.label}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="font-bold text-foreground">{rc.total}</p>
                        <p className="text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="font-bold text-red-400">{rc.denied}</p>
                        <p className="text-muted-foreground">Denied</p>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-400">{rc.allowed}</p>
                        <p className="text-muted-foreground">Allowed</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Block rate</span>
                      <span className={rc.block_rate > 50 ? "text-red-400" : "text-emerald-400"}>{rc.block_rate.toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-muted">
                      <div className="h-full rounded-full bg-red-500/60" style={{ width: `${Math.min(rc.block_rate, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calls + Cost Trajectory</CardTitle>
                <CardDescription>7-day operational load and spend by day</CardDescription>
              </div>
              <Badge variant="secondary">7 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CallsCostChart data={overview.calls_series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decision Breakdown</CardTitle>
            <CardDescription>Allow vs deny vs approval-required</CardDescription>
          </CardHeader>
          <CardContent>
            <DecisionPieChart data={overview.decision_breakdown} />
            <div className="mt-4 space-y-2">
              {overview.decision_breakdown.map((item) => (
                <div key={item.decision} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      item.decision === "ALLOW" ? "bg-primary" :
                      item.decision === "DENY" ? "bg-red-500" : "bg-amber-500"
                    }`} />
                    <span className="text-muted-foreground">{item.decision}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Active Agents Summary */}
      {agents.agents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Agents</CardTitle>
                <CardDescription>Agents registered in your organization</CardDescription>
              </div>
              <Link href={"/agents" as Route} className="flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.agents.slice(0, 6).map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}?org_id=${orgId}` as Route}
                  className="group rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{agent.name}</p>
                        <Badge variant={agent.status === "ACTIVE" ? "success" : "secondary"} className="text-[9px]">{agent.status ?? "ACTIVE"}</Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {agent.framework && <Badge variant="outline" className="text-[9px]">{agent.framework}</Badge>}
                        {agent.environment && <Badge variant={agent.environment === "PROD" ? "destructive" : "secondary"} className="text-[9px]">{agent.environment}</Badge>}
                      </div>
                      {agent.description && (
                        <p className="mt-1 max-w-full truncate text-xs text-muted-foreground">{agent.description}</p>
                      )}
                    </div>
                  </div>
                  {agent.stats && (
                    <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                      <span>{agent.stats.total_runs} runs</span>
                      <span>{agent.stats.total_audit_events} events</span>
                      {agent.stats.pending_approvals > 0 && (
                        <span className="text-amber-400">{agent.stats.pending_approvals} pending</span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Link href={"/runs" as Route}>
          <Card className="group transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-primary/10 p-3">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground group-hover:text-primary">Run Explorer</p>
                <p className="text-xs text-muted-foreground">Browse agent execution telemetry</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link href={"/approvals" as Route}>
          <Card className="group transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-foreground group-hover:text-primary">Approvals</p>
                <p className="text-xs text-muted-foreground">{overview.kpis.pending_approvals} pending requests</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link href={"/policy-studio" as Route}>
          <Card className="group transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-foreground group-hover:text-primary">Policy Studio</p>
                <p className="text-xs text-muted-foreground">Manage governance rules</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
