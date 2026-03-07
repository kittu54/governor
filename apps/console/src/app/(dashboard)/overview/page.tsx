import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CallsCostChart } from "@/components/charts/calls-cost-chart";
import { DecisionPieChart } from "@/components/charts/decision-pie-chart";
import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";

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

  const cards = [
    { label: "Tool Calls", value: overview.kpis.tool_calls.toLocaleString() },
    { label: "Blocked %", value: `${overview.kpis.blocked_pct.toFixed(1)}%` },
    { label: "Pending Approvals", value: overview.kpis.pending_approvals.toLocaleString() },
    { label: "Estimated Cost", value: `$${overview.kpis.estimated_cost_usd.toFixed(2)}` }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant="secondary" className="bg-[#f3eee4] text-[#11444d]">
                Real-time governance signal
              </Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Calls + Cost Trajectory</CardTitle>
            <CardDescription>7-day operational load and spend by day</CardDescription>
          </CardHeader>
          <CardContent>
            <CallsCostChart data={overview.calls_series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decision Mix</CardTitle>
            <CardDescription>Allow vs deny vs approval-required</CardDescription>
          </CardHeader>
          <CardContent>
            <DecisionPieChart data={overview.decision_breakdown} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
