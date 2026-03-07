import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

export default async function TenantsPage() {
  const data = await apiGet<TenantMetricsResponse>("/v1/metrics/tenants").catch(() => ({ tenants: [] }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>All organizations with governance metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.tenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tenants found. Ingest events to see organizations here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Tool Calls</TableHead>
                  <TableHead>Blocked %</TableHead>
                  <TableHead>Pending Approvals</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tenants.map((tenant) => (
                  <TableRow key={tenant.org_id}>
                    <TableCell>
                      <p className="font-medium">{tenant.org_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{tenant.org_id}</p>
                    </TableCell>
                    <TableCell>{tenant.tool_calls.toLocaleString()}</TableCell>
                    <TableCell>{tenant.blocked_pct.toFixed(1)}%</TableCell>
                    <TableCell>{tenant.pending_approvals}</TableCell>
                    <TableCell>${tenant.estimated_cost_usd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.blocked_pct > 20 ? "destructive" : "secondary"}>
                        {tenant.blocked_pct > 20 ? "High Block Rate" : "Normal"}
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
