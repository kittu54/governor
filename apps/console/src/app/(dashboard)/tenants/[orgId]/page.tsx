import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CallsCostChart } from "@/components/charts/calls-cost-chart";
import { apiGet } from "@/lib/api";

interface TenantMetricsResponse {
  tenants: Array<{
    org_id: string;
    org_name: string;
    tool_calls: number;
    estimated_cost_usd: number;
    blocked_pct: number;
    pending_approvals: number;
  }>;
}

interface OverviewResponse {
  kpis: {
    tool_calls: number;
    blocked_pct: number;
    pending_approvals: number;
    estimated_cost_usd: number;
  };
  calls_series: Array<{ date: string; calls: number; cost: number }>;
}

export default async function TenantExplorerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const [tenants, overview] = await Promise.all([
    apiGet<TenantMetricsResponse>("/v1/metrics/tenants").catch(() => ({ tenants: [] })),
    apiGet<OverviewResponse>(`/v1/metrics/overview?org_id=${orgId}`).catch(() => ({
      kpis: {
        tool_calls: 0,
        blocked_pct: 0,
        pending_approvals: 0,
        estimated_cost_usd: 0
      },
      calls_series: []
    }))
  ]);

  const tenant = tenants.tenants.find((item) => item.org_id === orgId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Explorer: {tenant?.org_name ?? orgId}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Tool Calls" value={overview.kpis.tool_calls.toLocaleString()} />
            <Metric label="Blocked %" value={`${overview.kpis.blocked_pct.toFixed(2)}%`} />
            <Metric label="Pending Approvals" value={overview.kpis.pending_approvals.toString()} />
            <Metric label="Estimated Cost" value={`$${overview.kpis.estimated_cost_usd.toFixed(2)}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <CallsCostChart data={overview.calls_series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Snapshot Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Blocked %</TableHead>
                <TableHead>Pending Approvals</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Incident Signal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.tenants.map((item) => (
                <TableRow key={item.org_id}>
                  <TableCell>{item.org_name}</TableCell>
                  <TableCell>{item.tool_calls}</TableCell>
                  <TableCell>{item.blocked_pct.toFixed(2)}%</TableCell>
                  <TableCell>{item.pending_approvals}</TableCell>
                  <TableCell>${item.estimated_cost_usd.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={item.blocked_pct > 20 ? "destructive" : "secondary"}>
                      {item.blocked_pct > 20 ? "High" : "Normal"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
