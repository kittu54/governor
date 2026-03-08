import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";
import { User, Shield, Building2, Key, Bot, Layers, Clock, ArrowRight } from "lucide-react";

interface OverviewResponse {
  kpis: {
    tool_calls: number;
    blocked_pct: number;
    pending_approvals: number;
    estimated_cost_usd: number;
    run_count?: number;
  };
}

interface AgentsResponse {
  agents: Array<{ id: string; name: string; status: string }>;
}

export default async function ProfilePage() {
  const orgId = await resolveOrgId();
  const { authMode } = await import("@/lib/clerk");

  const [overview, agentsData] = await Promise.all([
    apiGet<OverviewResponse>(`/v1/metrics/overview`).catch(() => ({
      kpis: { tool_calls: 0, blocked_pct: 0, pending_approvals: 0, estimated_cost_usd: 0, run_count: 0 }
    })),
    apiGet<AgentsResponse>(`/v1/agents`).catch(() => ({ agents: [] }))
  ]);

  const activeAgents = agentsData.agents.filter(a => a.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {authMode === "local" ? "Console Admin" : "Authenticated User"}
                </h1>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Governor Control Tower — {authMode === "local" ? "Local Mode" : "Authenticated"}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Badge variant="secondary">
                  <Shield className="mr-1 h-3 w-3" />
                  Admin
                </Badge>
                <Badge variant="secondary">
                  <Building2 className="mr-1 h-3 w-3" />
                  {orgId}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Org Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Agents</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{activeAgents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tool Calls</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{overview.kpis.tool_calls.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-400">{overview.kpis.pending_approvals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Cost</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${overview.kpis.estimated_cost_usd.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Account Details</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DetailRow label="Role" value="Administrator" />
              <DetailRow label="Organization" value={orgId} mono />
              <DetailRow label="Auth Provider" value={authMode === "clerk" ? "Clerk" : authMode === "supabase" ? "Supabase" : "Local Mode"} />
              <DetailRow label="Agents Managed" value={String(agentsData.agents.length)} />
            </div>
          </CardContent>
        </Card>

        {/* Your Agents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Your Agents</CardTitle>
              </div>
              <Link href={"/agents" as Route} className="flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {agentsData.agents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No agents registered.</p>
            ) : (
              <div className="space-y-2">
                {agentsData.agents.slice(0, 5).map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}` as Route}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium text-foreground">{agent.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{agent.id}</span>
                    </div>
                    <Badge variant={agent.status === "ACTIVE" ? "success" : "secondary"} className="text-[10px]">
                      {agent.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
