"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Server, RefreshCw, ChevronDown, ChevronRight,
  Shield, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface MCPServerItem {
  id: string;
  org_id: string;
  name: string;
  base_url: string;
  description: string | null;
  auth_type: string;
  is_active: boolean;
  tool_count: number;
  last_sync_at: string | null;
  created_at: string;
}

interface MCPToolItem {
  id: string;
  tool_name: string;
  description: string | null;
  risk_class: string;
  is_sensitive: boolean;
  is_active: boolean;
}

interface Props {
  orgId: string;
  initialServers: MCPServerItem[];
}

function riskBadge(rc: string) {
  const colors: Record<string, string> = {
    MONEY_MOVEMENT: "bg-red-500/15 text-red-400 border-red-500/30",
    CODE_EXECUTION: "bg-red-500/15 text-red-400 border-red-500/30",
    CREDENTIAL_USE: "bg-red-500/15 text-red-400 border-red-500/30",
    DATA_EXPORT: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    ADMIN_ACTION: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    PII_ACCESS: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    FILE_MUTATION: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    EXTERNAL_COMMUNICATION: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    DATA_WRITE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    LOW_RISK: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
  return <Badge className={`text-[10px] ${colors[rc] ?? ""}`}>{rc}</Badge>;
}

export function MCPServersClient({ orgId, initialServers }: Props) {
  const [servers, setServers] = useState<MCPServerItem[]>(initialServers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tools, setTools] = useState<MCPToolItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadTools(serverId: string) {
    if (expandedId === serverId) { setExpandedId(null); return; }
    setExpandedId(serverId);
    try {
      const res = await apiFetch(`/v1/mcp/servers/${serverId}/tools`);
      if (res.ok) {
        const data = await res.json();
        setTools(data.tools);
      } else {
        showToast("Failed to load tools", "error");
      }
    } catch {
      showToast("Network error loading tools", "error");
    }
  }

  function createServer(formData: FormData) {
    startTransition(async () => {
      const payload = {
        org_id: orgId,
        name: formData.get("name"),
        base_url: formData.get("base_url"),
        description: formData.get("description") || undefined,
        auth_type: formData.get("auth_type"),
      };

      const res = await apiFetch(`/v1/mcp/servers`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setServers(prev => [{
          ...created,
          description: payload.description ?? null,
          tool_count: 0,
          last_sync_at: null,
          created_at: new Date().toISOString(),
        }, ...prev]);
        setShowCreate(false);
        showToast("MCP server registered");
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.error ?? "Failed to register server", "error");
      }
    });
  }

  async function deleteServer(serverId: string) {
    setLoadingAction(serverId);
    try {
      const res = await apiFetch(`/v1/mcp/servers/${serverId}`, { method: "DELETE" });
      if (res.ok) {
        setServers(prev => prev.filter(s => s.id !== serverId));
        if (expandedId === serverId) setExpandedId(null);
        showToast("Server deleted");
      } else {
        showToast("Failed to delete", "error");
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function syncTools(serverId: string) {
    setLoadingAction(`sync-${serverId}`);
    try {
      const serverDetail = await apiFetch(`/v1/mcp/servers/${serverId}`);
      if (!serverDetail.ok) { showToast("Failed to load server", "error"); return; }
      const serverData = await serverDetail.json();

      const sampleTools = [
        { name: "list_resources", description: "List available resources" },
        { name: "read_resource", description: "Read a specific resource" },
        { name: "call_tool", description: "Execute a tool on the server" },
      ];

      const res = await apiFetch(`/v1/mcp/servers/${serverId}/sync`, {
        method: "POST",
        body: JSON.stringify({ tools: sampleTools }),
      });

      if (res.ok) {
        const data = await res.json();
        setServers(prev => prev.map(s =>
          s.id === serverId
            ? { ...s, tool_count: data.total_tools, last_sync_at: new Date().toISOString() }
            : s
        ));
        if (expandedId === serverId) await loadTools(serverId);
        showToast(`Synced: ${data.created} new, ${data.updated} updated`);
      } else {
        showToast("Sync failed", "error");
      }
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error" ? "border-red-500/30 bg-red-950/80 text-red-300" : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">MCP Servers</h2>
          <p className="text-sm text-muted-foreground">Register and manage Model Context Protocol servers. Sync tools and apply governance policies.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "secondary" : "default"} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Register Server
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">Register MCP Server</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" action={createServer}>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input name="name" placeholder="e.g. filesystem-server" required />
              </div>
              <div className="space-y-1.5">
                <Label>Base URL</Label>
                <Input name="base_url" placeholder="http://localhost:3001" type="url" required />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input name="description" placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label>Auth Type</Label>
                <select name="auth_type" defaultValue="NONE" className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                  <option value="NONE">None</option>
                  <option value="API_KEY">API Key</option>
                  <option value="BEARER_TOKEN">Bearer Token</option>
                  <option value="OAUTH">OAuth</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isPending} size="sm">
                  {isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Registering...</> : "Register Server"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {servers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No MCP servers registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {servers.map(server => (
            <Card key={server.id} className={expandedId === server.id ? "ring-1 ring-primary/30" : ""}>
              <div
                className="flex cursor-pointer items-center gap-3 p-4 hover:bg-muted/30"
                onClick={() => loadTools(server.id)}
              >
                {expandedId === server.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <Server className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{server.name}</span>
                    <Badge variant={server.is_active ? "success" : "secondary"}>
                      {server.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{server.auth_type}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{server.base_url}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" /> {server.tool_count} tool{server.tool_count !== 1 ? "s" : ""}
                  </span>
                  {server.last_sync_at && (
                    <span>Synced {new Date(server.last_sync_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              {expandedId === server.id && (
                <div className="border-t border-border bg-muted/10 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingAction === `sync-${server.id}`}
                      onClick={(e) => { e.stopPropagation(); syncTools(server.id); }}
                    >
                      {loadingAction === `sync-${server.id}`
                        ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        : <RefreshCw className="mr-1 h-3 w-3" />
                      }
                      Sync Tools
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={loadingAction === server.id}
                      onClick={(e) => { e.stopPropagation(); deleteServer(server.id); }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                  </div>

                  {tools.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No tools synced yet. Click "Sync Tools" to discover tools.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {tools.map(tool => (
                        <div key={tool.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                          <div>
                            <span className="font-mono text-sm">{tool.tool_name}</span>
                            {tool.description && <p className="text-xs text-muted-foreground">{tool.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {riskBadge(tool.risk_class)}
                            {tool.is_sensitive && <Badge variant="destructive" className="text-[10px]">Sensitive</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
