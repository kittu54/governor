import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";

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

  const data = await apiGet<AgentMetricsResponse>(`/v1/metrics/agents/${agentId}`).catch(() => ({
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Explorer: {data.agent.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Agent ID" value={data.agent.id} mono />
            <Metric label="Org" value={data.agent.org_id} mono />
            <Metric label="Tool Calls" value={String(data.agent.tool_calls)} />
            <Metric label="Error Rate" value={`${data.agent.error_rate.toFixed(2)}%`} />
            <Metric label="Blocked Actions" value={String(data.agent.blocked_actions)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools Used</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Invocations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.agent.tools_used.map((tool) => (
                <TableRow key={tool.tool}>
                  <TableCell className="font-mono text-xs">{tool.tool}</TableCell>
                  <TableCell>{tool.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
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
                  <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{event.toolName}.{event.toolAction}</TableCell>
                  <TableCell>
                    <Badge variant={event.decision === "DENY" ? "destructive" : event.decision === "ALLOW" ? "default" : "secondary"}>
                      {event.decision}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell>{event.latencyMs ?? "-"} ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}
