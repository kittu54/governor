import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import { ArrowLeft, Activity, AlertTriangle, ShieldAlert, Wrench } from "lucide-react";

interface AgentMetricsResponse {
  agent: {
    id: string;
    org_id: string;
    name: string;
    tool_calls: number;
    error_rate: number;
    blocked_actions: number;
    tools_used: Array<{ tool: string; count: number }>;
  };
  recent_events: Array<{
    id: string;
    timestamp: string;
    toolName: string;
    toolAction: string;
    decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
    status: "PENDING" | "SUCCESS" | "ERROR" | "DENIED" | "REQUIRES_APPROVAL";
    latencyMs?: number | null;
  }>;
}

export default async function AgentExplorerPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const orgId = await resolveOrgId();

  const data = await apiGet<AgentMetricsResponse>(`/v1/metrics/agents/${agentId}?org_id=${encodeURIComponent(orgId)}`).catch(() => ({
    agent: {
      id: agentId,
      org_id: "unknown",
      name: "Unknown Agent",
      tool_calls: 0,
      error_rate: 0,
      blocked_actions: 0,
      tools_used: []
    },
    recent_events: []
  }));

  const successEvents = data.recent_events.filter(e => e.status === "SUCCESS").length;
  const errorEvents = data.recent_events.filter(e => e.status === "ERROR").length;
  const avgLatency = data.recent_events.filter(e => e.latencyMs).reduce((sum, e) => sum + (e.latencyMs ?? 0), 0) / (data.recent_events.filter(e => e.latencyMs).length || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={"/agents" as Route} className="rounded-lg border border-border bg-muted p-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{data.agent.name}</h1>
          <p className="text-sm font-mono text-muted-foreground">{data.agent.id}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tool Calls</p>
            <p className="mt-1 text-2xl font-bold text-primary">{data.agent.tool_calls.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Error Rate</p>
            <p className={`mt-1 text-2xl font-bold ${data.agent.error_rate > 5 ? "text-red-400" : "text-emerald-400"}`}>
              {data.agent.error_rate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Blocked</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{data.agent.blocked_actions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Success / Error</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              <span className="text-emerald-400">{successEvents}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-red-400">{errorEvents}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Latency</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{avgLatency.toFixed(0)}ms</p>
          </CardContent>
        </Card>
      </section>

      {/* Tools Used */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Tools Used</CardTitle>
          </div>
          <CardDescription>{data.agent.tools_used.length} unique tools</CardDescription>
        </CardHeader>
        <CardContent>
          {data.agent.tools_used.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No tool usage data available</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.agent.tools_used.map((tool) => (
                <div key={tool.tool} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <span className="font-mono text-sm text-foreground">{tool.tool}</span>
                  <Badge variant="secondary">{tool.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest tool call events for this agent</CardDescription>
            </div>
            <Badge variant="secondary">{data.recent_events.length} events</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{event.toolName}.{event.toolAction}</TableCell>
                  <TableCell>
                    <Badge variant={event.decision === "DENY" ? "destructive" : event.decision === "ALLOW" ? "success" : "warning"}>
                      {event.decision}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.status === "ERROR" ? "destructive" : event.status === "SUCCESS" ? "success" : "secondary"}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{event.latencyMs != null ? `${event.latencyMs}ms` : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
