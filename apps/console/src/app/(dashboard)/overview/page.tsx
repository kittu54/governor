import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallsCostChart } from "@/components/charts/calls-cost-chart";
import { DecisionPieChart } from "@/components/charts/decision-pie-chart";
import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import { Activity, ShieldAlert, Clock, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

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
  kpis: {
    tool_calls: 0,
    blocked_pct: 0,
    pending_approvals: 0,
    estimated_cost_usd: 0
  },
  calls_series: [],
  decision_breakdown: [
    { decision: "ALLOW", value: 0 },
    { decision: "DENY", value: 0 },
    { decision: "REQUIRE_APPROVAL", value: 0 }
  ]
};

export default async function OverviewPage() {
  const orgId = await resolveOrgId();
  const overview = await apiGet<OverviewResponse>(`/v1/metrics/overview?org_id=${orgId}`).catch(() => fallback);

  const totalDecisions = overview.decision_breakdown.reduce((sum, d) => sum + d.value, 0);
  const allowRate = totalDecisions > 0
    ? ((overview.decision_breakdown.find(d => d.decision === "ALLOW")?.value ?? 0) / totalDecisions * 100)
    : 0;

  const avgDailyCost = overview.calls_series.length > 0
    ? overview.calls_series.reduce((sum, d) => sum + d.cost, 0) / overview.calls_series.length
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
      color: overview.kpis.pending_approvals > 5 ? "text-amber-400" : "text-primary"
    },
    {
      label: "Estimated Cost",
      value: `$${overview.kpis.estimated_cost_usd.toFixed(2)}`,
      icon: DollarSign,
      trend: overview.kpis.estimated_cost_usd > 100 ? "high" : "normal",
      color: "text-primary"
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="overflow-hidden">
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
        })}
      </section>

      {/* Quick Stats Row */}
      <section className="grid gap-4 sm:grid-cols-3">
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
            <p className="mt-2 text-xs text-muted-foreground">Across all policy evaluations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Daily Cost</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${avgDailyCost.toFixed(2)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Over the last {overview.calls_series.length} days</p>
          </CardContent>
        </Card>
      </section>

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
    </div>
  );
}
