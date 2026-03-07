import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import { AgentsClient } from "@/components/agents/agents-client";
import { Bot, Activity, AlertTriangle } from "lucide-react";

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

  const totalAgents = data.agents.length;
  const recentAgents = data.agents.filter(a => {
    const created = new Date(a.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Agents</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalAgents}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New This Week</p>
                <p className="mt-2 text-3xl font-bold text-primary">{recentAgents}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Organization</p>
                <p className="mt-2 text-lg font-bold font-mono text-foreground truncate">{orgId}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Agents Table with Add Agent */}
      <AgentsClient initialAgents={data.agents} orgId={orgId} />
    </div>
  );
}
