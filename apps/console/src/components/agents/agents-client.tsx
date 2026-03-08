"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Plus, X, Loader2, Search, Filter, ShieldCheck, Clock, Layers } from "lucide-react";

interface Agent {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  framework?: string | null;
  tags?: string[] | null;
  allowedTools?: Array<{ tool_name: string; tool_action: string }> | null;
  createdAt: string;
  stats?: {
    total_runs: number;
    total_audit_events: number;
    pending_approvals: number;
  };
}

interface AgentsClientProps {
  initialAgents: Agent[];
  orgId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const STATUS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export function AgentsClient({ initialAgents, orgId }: AgentsClientProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    framework: "",
    tags: "",
    allowedTools: ""
  });

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.id.toLowerCase().includes(q)
          || a.name.toLowerCase().includes(q)
          || (a.description?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [agents, search, statusFilter]);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  function handleCreate() {
    if (!form.id.trim() || !form.name.trim()) {
      showToast("Agent ID and Name are required", "error");
      return;
    }

    startTransition(async () => {
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);

      const allowedTools = form.allowedTools
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [tool_name, tool_action = "*"] = line.split(".");
          return { tool_name: tool_name.trim(), tool_action: tool_action.trim() };
        });

      const payload = {
        id: form.id.trim(),
        org_id: orgId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: "ACTIVE" as const,
        framework: form.framework || undefined,
        tags: tags.length > 0 ? tags : undefined,
        allowed_tools: allowedTools.length > 0 ? allowedTools : undefined
      };

      const response = await fetch(`${API_BASE_URL}/v1/agents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        showToast(err?.error ?? "Failed to create agent", "error");
        return;
      }

      const agent = await response.json();
      setAgents((prev) => [{
        id: agent.id,
        orgId: agent.orgId,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        tags: agent.tags,
        allowedTools: agent.allowedTools,
        createdAt: agent.createdAt,
        stats: { total_runs: 0, total_audit_events: 0, pending_approvals: 0 }
      }, ...prev]);
      setForm({ id: "", name: "", description: "", framework: "", tags: "", allowedTools: "" });
      setShowAddForm(false);
      showToast("Agent registered");
    });
  }

  const activeCount = agents.filter(a => a.status === "ACTIVE").length;
  const totalRuns = agents.reduce((sum, a) => sum + (a.stats?.total_runs ?? 0), 0);
  const pendingApprovals = agents.reduce((sum, a) => sum + (a.stats?.pending_approvals ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error"
            ? "border-red-500/30 bg-red-950/80 text-red-300"
            : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Agents</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{agents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Runs</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalRuns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-400">{pendingApprovals}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registered Agents</CardTitle>
              <CardDescription>Manage agents, their configurations, and track their activity.</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
              {showAddForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {showAddForm ? "Cancel" : "Register Agent"}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Registration Form */}
          {showAddForm && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
              <h4 className="mb-4 text-sm font-semibold text-foreground">Register New Agent</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="agent-id">Agent ID *</Label>
                  <Input
                    id="agent-id"
                    placeholder="agent_code_review_01"
                    value={form.id}
                    onChange={(e) => setForm(f => ({ ...f, id: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier. Letters, numbers, underscores, hyphens.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-name">Agent Name *</Label>
                  <Input
                    id="agent-name"
                    placeholder="Code Review Bot"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-framework">Platform / Framework</Label>
                  <select
                    id="agent-framework"
                    value={form.framework}
                    onChange={(e) => setForm(f => ({ ...f, framework: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
                  >
                    <option value="">Select platform...</option>
                    <optgroup label="No-Code">
                      <option value="zapier">Zapier Central</option>
                      <option value="mindstudio">MindStudio</option>
                      <option value="lindy">Lindy</option>
                      <option value="agentgpt">AgentGPT</option>
                      <option value="relevance_ai">Relevance AI</option>
                    </optgroup>
                    <optgroup label="Enterprise">
                      <option value="copilot_studio">Microsoft Copilot Studio</option>
                      <option value="vertex_ai">Google Vertex AI</option>
                      <option value="agentforce">Salesforce Agentforce</option>
                      <option value="watsonx">IBM watsonx.ai</option>
                    </optgroup>
                    <optgroup label="Developer Frameworks">
                      <option value="langchain">LangChain / LangGraph</option>
                      <option value="crewai">CrewAI</option>
                      <option value="autogen">Microsoft AutoGen</option>
                      <option value="pydantic_ai">PydanticAI</option>
                    </optgroup>
                    <optgroup label="Workflow Automation">
                      <option value="n8n">n8n</option>
                      <option value="make">Make.com</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="mcp">MCP</option>
                      <option value="custom">Custom / SDK</option>
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="agent-desc">Description</Label>
                  <Textarea
                    id="agent-desc"
                    placeholder="What does this agent do? What tools does it use? What's its purpose?"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-tags">Tags</Label>
                  <Input
                    id="agent-tags"
                    placeholder="finance, tier-1, production"
                    value={form.tags}
                    onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated tags for categorization.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-tools">Allowed Tools</Label>
                  <Textarea
                    id="agent-tools"
                    placeholder={"stripe.refund\nslack.post_message\ngithub.*"}
                    value={form.allowedTools}
                    onChange={(e) => setForm(f => ({ ...f, allowedTools: e.target.value }))}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">One per line: tool_name.tool_action (* for all actions).</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleCreate} disabled={isPending} size="sm">
                  {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</> : "Register Agent"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Agents Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {agents.length === 0
                  ? "No agents registered. Click 'Register Agent' to get started."
                  : "No agents match your filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead />
              </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-primary/10 p-1.5">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{agent.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{agent.id}</p>
                          {agent.description && (
                            <p className="mt-0.5 max-w-[300px] truncate text-xs text-muted-foreground">{agent.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.framework ? (
                        <Badge variant="outline" className="capitalize text-[10px]">{agent.framework}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        agent.status === "ACTIVE" ? "success" :
                        agent.status === "SUSPENDED" ? "destructive" : "secondary"
                      }>
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(agent.tags) ? agent.tags : []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{agent.stats?.total_runs ?? 0}</TableCell>
                    <TableCell>
                      {(agent.stats?.pending_approvals ?? 0) > 0 ? (
                        <Badge variant="warning">{agent.stats!.pending_approvals}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/agents/${agent.id}?org_id=${encodeURIComponent(orgId)}` as Route}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Manage
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
