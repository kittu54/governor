import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";

interface AgentsResponse {
  agents: Array<{
    id: string;
    orgId: string;
    name: string;
    createdAt: string;
  }>;
}

export default async function AgentsPage() {
  const orgId = await resolveOrgId();
  const data = await apiGet<AgentsResponse>(`/v1/metrics/agents?org_id=${orgId}`).catch(() => ({ agents: [] }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agents</CardTitle>
          <CardDescription>All registered agents for {orgId}.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.agents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No agents found. Ingest events to see agents here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="font-mono text-xs">{agent.id}</TableCell>
                    <TableCell className="font-mono text-xs">{agent.orgId}</TableCell>
                    <TableCell>
                      <Link href={`/agents/${agent.id}` as Route} className="text-sm font-medium text-primary hover:underline">
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
