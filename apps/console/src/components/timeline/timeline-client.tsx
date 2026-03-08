"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X } from "lucide-react";
import { API_BASE_URL, apiFetch } from "@/lib/api";

interface AuditEvent {
  id: string;
  timestamp: string;
  orgId: string;
  agentId: string;
  toolName: string;
  toolAction: string;
  decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  status: "PENDING" | "SUCCESS" | "ERROR" | "DENIED" | "REQUIRES_APPROVAL";
  costEstimateUsd: number;
  latencyMs?: number | null;
  policyTrace?: Array<{ code: string; message: string }>;
}

interface TimelineClientProps {
  orgId: string;
  initialEvents: AuditEvent[];
}

function decisionVariant(decision: AuditEvent["decision"]) {
  if (decision === "ALLOW") return "success" as const;
  if (decision === "DENY") return "destructive" as const;
  return "warning" as const;
}

function statusVariant(status: AuditEvent["status"]) {
  if (status === "SUCCESS") return "success" as const;
  if (status === "ERROR" || status === "DENIED") return "destructive" as const;
  return "secondary" as const;
}

export function TimelineClient({ orgId, initialEvents }: TimelineClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [agentFilter, setAgentFilter] = useState("");
  const [toolFilter, setToolFilter] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ org_id: orgId, limit: "100" });
    if (agentFilter) params.set("agent_id", agentFilter);
    if (toolFilter) params.set("tool_name", toolFilter);
    return params.toString();
  }, [agentFilter, orgId, toolFilter]);

  // Summary stats
  const allowed = events.filter(e => e.decision === "ALLOW").length;
  const denied = events.filter(e => e.decision === "DENY").length;
  const pendingApproval = events.filter(e => e.decision === "REQUIRE_APPROVAL").length;

  useEffect(() => {
    async function refresh() {
      const res = await apiFetch(`/v1/audit/events?${query}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events ?? []);
    }

    refresh().catch(() => null);
  }, [query]);

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/v1/events/stream`);

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "audit.created" || parsed.type === "audit.updated") {
          apiFetch(`/v1/audit/events?${query}`, { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.events) setEvents(data.events);
            })
            .catch(() => null);
        }
      } catch {
        // no-op
      }
    };

    return () => {
      source.close();
    };
  }, [orgId, query]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Events</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{events.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Allowed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{allowed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Denied</p>
            <p className="mt-1 text-2xl font-bold text-red-400">{denied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Approval</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{pendingApproval}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
              <CardTitle>Live Agent Timeline</CardTitle>
            </div>
            <Badge variant="success" className="text-[10px]">Streaming</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="Filter by agent_id..." value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} />
            <Input placeholder="Filter by tool_name..." value={toolFilter} onChange={(e) => setToolFilter(e.target.value)} />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No events yet. Activity will appear here in real time.</p>
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{event.agentId}</TableCell>
                    <TableCell className="font-mono text-xs">{event.toolName}.{event.toolAction}</TableCell>
                    <TableCell>
                      <Badge variant={decisionVariant(event.decision)}>{event.decision}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">${event.costEstimateUsd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
                        Trace
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trace Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Decision Trace</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event ID</span>
                  <span className="font-mono text-xs">{selected.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tool</span>
                  <span className="font-mono text-xs">{selected.toolName}.{selected.toolAction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Decision</span>
                  <Badge variant={decisionVariant(selected.decision)}>{selected.decision}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span>${selected.costEstimateUsd.toFixed(2)}</span>
                </div>
                {selected.latencyMs != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latency</span>
                    <span>{selected.latencyMs}ms</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-2 font-medium text-foreground">Policy Trace</h4>
                <div className="space-y-2">
                  {(selected.policyTrace ?? []).map((item, index) => (
                    <div key={`${item.code}-${index}`} className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="font-mono text-xs font-medium text-primary">{item.code}</p>
                      <p className="mt-1 text-muted-foreground">{item.message}</p>
                    </div>
                  ))}
                  {(selected.policyTrace ?? []).length === 0 && (
                    <p className="text-muted-foreground">No trace available for this event.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
