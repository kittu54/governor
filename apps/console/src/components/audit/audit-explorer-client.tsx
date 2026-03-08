"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileText, Clock } from "lucide-react";

interface AuditEntry {
  id: string;
  org_id: string;
  actor_type: string;
  actor_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  payload: unknown;
  created_at: string;
}

interface Props {
  entries: AuditEntry[];
  total: number;
  orgId: string;
}

function actorBadge(type: string) {
  switch (type) {
    case "USER": return "default" as const;
    case "SYSTEM": return "secondary" as const;
    case "AGENT": return "outline" as const;
    default: return "outline" as const;
  }
}

function eventColor(eventType: string): string {
  if (eventType.includes("created")) return "text-green-600";
  if (eventType.includes("updated") || eventType.includes("published")) return "text-blue-600";
  if (eventType.includes("deleted") || eventType.includes("deny")) return "text-red-600";
  if (eventType.includes("approve")) return "text-emerald-600";
  if (eventType.includes("rollback")) return "text-orange-600";
  return "text-muted-foreground";
}

export function AuditExplorerClient({ entries: initialEntries, total, orgId }: Props) {
  const [entries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const eventTypes = [...new Set(entries.map((e) => e.event_type))].sort();
  const entityTypes = [...new Set(entries.map((e) => e.entity_type))].sort();

  const filtered = entries.filter((e) => {
    const matchSearch = !search ||
      e.summary.toLowerCase().includes(search.toLowerCase()) ||
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      (e.entity_id?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchType = !filterType || e.event_type === filterType;
    const matchEntity = !filterEntity || e.entity_type === filterEntity;
    return matchSearch && matchType && matchEntity;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Explorer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Immutable record of every action taken within Governor
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Events</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Event Types</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{eventTypes.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Entity Types</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{entityTypes.length}</p></CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Event Types</option>
          {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
        >
          <option value="">All Entities</option>
          {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {entries.length === 0
                ? "No audit events recorded yet. Events are created when policies, tools, agents, or approvals are modified."
                : "No events match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="mt-1">
                      <Clock className={`h-4 w-4 ${eventColor(entry.event_type)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${eventColor(entry.event_type)}`}>
                          {entry.event_type}
                        </span>
                        <Badge variant={actorBadge(entry.actor_type)} className="text-xs">
                          {entry.actor_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {entry.entity_type}
                        </Badge>
                        {entry.entity_id && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {entry.entity_id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{entry.summary}</p>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </time>
                  </div>
                  {expandedId === entry.id && entry.payload != null && (
                    <div className="mt-3 ml-7 p-3 bg-muted rounded-md">
                      <pre className="text-xs overflow-auto max-h-48">
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
