import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallsCostChart } from "@/components/charts/calls-cost-chart";
import { DecisionPieChart } from "@/components/charts/decision-pie-chart";
import { apiGet } from "@/lib/api";
import { Activity, ShieldAlert, Clock, DollarSign, ArrowLeft } from "lucide-react";

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

const fallback: OverviewResponse = {
  kpis: { tool_calls: 0, blocked_pct: 0, pending_approvals: 0, estimated_cost_usd: 0 },
  calls_series: [],
  decision_breakdown: [
    { decision: "ALLOW", value: 0 },
    { decision: "DENY", value: 0 },
    { decision: "REQUIRE_APPROVAL", value: 0 }
  ]
};

export default async function TenantExplorerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const overview = await apiGet<OverviewResponse>(`/v1/metrics/overview?org_id=${orgId}`).catch(() => fallback);

  const totalDecisions = overview.decision_breakdown.reduce((sum, d) => sum + d.value, 0);
  const allowRate = totalDecisions > 0
    ? ((overview.decision_breakdown.find(d => d.decision === "ALLOW")?.value ?? 0) / totalDecisions * 100)
    : 0;

  const kpiCards = [
    { label: "Tool Calls", value: overview.kpis.tool_calls.toLocaleString(), icon: Activity, color: "text-primary" },
    { label: "Blocked Rate", value: `${overview.kpis.blocked_pct.toFixed(1)}%`, icon: ShieldAlert, color: overview.kpis.blocked_pct > 15 ? "text-red-400" : "text-emerald-400" },
    { label: "Pending Approvals", value: overview.kpis.pending_approvals.toLocaleString(), icon: Clock, color: overview.kpis.pending_approvals > 0 ? "text-amber-400" : "text-primary" },
    { label: "Estimated Cost", value: `$${overview.kpis.estimated_cost_usd.toFixed(2)}`, icon: DollarSign, color: "text-primary" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={"/tenants" as Route} className="rounded-lg border border-border bg-muted p-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenant: {orgId}</h1>
          <p className="text-sm text-muted-foreground">Detailed governance metrics for this organization</p>
        </div>
      </div>

      {/* KPI Cards - using same formatting as overview page */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
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
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Stats Row */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Allow Rate</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{allowRate.toFixed(1)}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${Math.min(allowRate, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Decisions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalDecisions.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">Policy evaluations in this period</p>
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usage Pattern</CardTitle>
                <CardDescription>Tool calls and cost over time</CardDescription>
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
            <CardTitle>Decision Mix</CardTitle>
            <CardDescription>Policy decision distribution</CardDescription>
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
    </div>
  );
}
