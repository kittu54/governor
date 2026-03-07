import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { Building2, TrendingUp, DollarSign, ShieldAlert } from "lucide-react";

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

export default async function TenantsPage() {
  const data = await apiGet<TenantMetricsResponse>("/v1/metrics/tenants").catch(() => ({ tenants: [] }));

  const totalTenants = data.tenants.length;
  const totalCalls = data.tenants.reduce((sum, t) => sum + t.tool_calls, 0);
  const totalCost = data.tenants.reduce((sum, t) => sum + t.estimated_cost_usd, 0);
  const avgBlocked = totalTenants > 0
    ? data.tenants.reduce((sum, t) => sum + t.blocked_pct, 0) / totalTenants
    : 0;
  const totalPending = data.tenants.reduce((sum, t) => sum + t.pending_approvals, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Organizations</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalTenants}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Tool Calls</p>
                <p className="mt-2 text-3xl font-bold text-primary">{totalCalls.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Spend</p>
                <p className="mt-2 text-3xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
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
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Blocked Rate</p>
                <p className={`mt-2 text-3xl font-bold ${avgBlocked > 15 ? "text-red-400" : "text-emerald-400"}`}>
                  {avgBlocked.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <ShieldAlert className={`h-5 w-5 ${avgBlocked > 15 ? "text-red-400" : "text-emerald-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>Governance metrics across all tenants. {totalPending > 0 ? `${totalPending} pending approvals total.` : ""}</CardDescription>
            </div>
            <Badge variant="secondary">{totalTenants} tenants</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {data.tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No tenants found. Ingest events to see organizations here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Tool Calls</TableHead>
                  <TableHead>Blocked Rate</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tenants.map((tenant) => (
                  <TableRow key={tenant.org_id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{tenant.org_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{tenant.org_id}</p>
                    </TableCell>
                    <TableCell className="font-mono">{tenant.tool_calls.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={tenant.blocked_pct > 15 ? "text-red-400" : "text-foreground"}>
                        {tenant.blocked_pct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {tenant.pending_approvals > 0 ? (
                        <Badge variant="warning">{tenant.pending_approvals}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">${tenant.estimated_cost_usd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.blocked_pct > 20 ? "destructive" : tenant.blocked_pct > 10 ? "warning" : "success"}>
                        {tenant.blocked_pct > 20 ? "Critical" : tenant.blocked_pct > 10 ? "Warning" : "Healthy"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tenants/${tenant.org_id}` as Route} className="text-sm font-medium text-primary hover:underline">
                        Details
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
