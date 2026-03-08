"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Search, AlertTriangle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface Tool {
  id: string;
  org_id: string;
  tool_name: string;
  tool_action: string;
  display_name: string | null;
  description: string | null;
  risk_class: string;
  risk_severity: number;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

interface RiskClassInfo {
  id: string;
  label: string;
  severity: number;
  description: string;
}

interface Props {
  tools: Tool[];
  riskClasses: RiskClassInfo[];
  orgId: string;
}

function riskBadgeVariant(severity: number): "default" | "secondary" | "destructive" | "outline" {
  if (severity >= 90) return "destructive";
  if (severity >= 70) return "default";
  if (severity >= 50) return "secondary";
  return "outline";
}

export function ToolRegistryClient({ tools: initialTools, riskClasses, orgId }: Props) {
  const [tools, setTools] = useState(initialTools);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  const [classifyResult, setClassifyResult] = useState<{
    tool_name: string;
    tool_action: string;
    risk_class: string;
    source: string;
    reason: string;
    confidence: number;
    severity: number;
  } | null>(null);

  const [form, setForm] = useState({
    tool_name: "",
    tool_action: "",
    display_name: "",
    description: "",
    risk_class: "LOW_RISK",
    is_sensitive: false,
  });

  const filtered = tools.filter((t) => {
    const matchSearch = !search ||
      t.tool_name.toLowerCase().includes(search.toLowerCase()) ||
      t.tool_action.toLowerCase().includes(search.toLowerCase()) ||
      (t.display_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchRisk = !filterRisk || t.risk_class === filterRisk;
    return matchSearch && matchRisk;
  });

  async function handleClassify() {
    if (!form.tool_name || !form.tool_action) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/v1/tools/classify-risk?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool_name: form.tool_name, tool_action: form.tool_action }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setClassifyResult(data);
        setForm((prev) => ({ ...prev, risk_class: data.risk_class, is_sensitive: data.severity >= 70 }));
      } else {
        showToast("Auto-classify failed", "error");
      }
    } catch {
      showToast("Network error during classification", "error");
    }
  }

  async function handleCreate() {
    if (!form.tool_name || !form.tool_action) return;
    startTransition(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/tools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: orgId,
            tool_name: form.tool_name,
            tool_action: form.tool_action,
            display_name: form.display_name || undefined,
            description: form.description || undefined,
            risk_class: form.risk_class,
            is_sensitive: form.is_sensitive,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setTools((prev) => [
            {
              ...data,
              risk_severity: riskClasses.find((r) => r.id === data.risk_class)?.severity ?? 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ]);
          setShowCreate(false);
          setForm({ tool_name: "", tool_action: "", display_name: "", description: "", risk_class: "LOW_RISK", is_sensitive: false });
          setClassifyResult(null);
          showToast("Tool registered successfully");
        } else {
          const err = await res.json().catch(() => null);
          showToast(err?.message ?? "Failed to register tool", "error");
        }
      } catch {
        showToast("Network error registering tool", "error");
      }
    });
  }

  const riskCounts = tools.reduce<Record<string, number>>((acc, t) => {
    acc[t.risk_class] = (acc[t.risk_class] ?? 0) + 1;
    return acc;
  }, {});

  const sensitiveCount = tools.filter((t) => t.is_sensitive).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error"
            ? "border-red-500/30 bg-red-950/80 text-red-300"
            : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tool Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Register tools, assign risk classes, and control sensitivity flags
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" /> Register Tool
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered Tools</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tools.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sensitive Actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{sensitiveCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Risk</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {tools.filter((t) => t.risk_severity >= 90).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risk Classes Used</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Object.keys(riskCounts).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Register Tool</CardTitle>
            <CardDescription>Add a tool to the registry with its risk classification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tool Name</label>
                <Input
                  placeholder="e.g. stripe"
                  value={form.tool_name}
                  onChange={(e) => setForm({ ...form, tool_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tool Action</label>
                <Input
                  placeholder="e.g. refund"
                  value={form.tool_action}
                  onChange={(e) => setForm({ ...form, tool_action: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  placeholder="Human-readable name"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Risk Class</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.risk_class}
                  onChange={(e) => setForm({ ...form, risk_class: e.target.value })}
                >
                  {riskClasses.map((rc) => (
                    <option key={rc.id} value={rc.id}>
                      {rc.label} (severity {rc.severity})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="What this tool does"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_sensitive}
                onChange={(e) => setForm({ ...form, is_sensitive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label className="text-sm">Mark as sensitive (default deny in PROD when no explicit allow)</label>
            </div>

            {classifyResult && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium">Auto-classified: {classifyResult.risk_class}</p>
                <p className="text-muted-foreground">
                  Source: {classifyResult.source} &bull; Confidence: {Math.round(classifyResult.confidence * 100)}% &bull; {classifyResult.reason}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClassify} disabled={!form.tool_name || !form.tool_action}>
                <Shield className="h-4 w-4 mr-2" /> Auto-Classify Risk
              </Button>
              <Button onClick={handleCreate} disabled={isPending || !form.tool_name || !form.tool_action}>
                {isPending ? "Registering..." : "Register Tool"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
        >
          <option value="">All Risk Classes</option>
          {riskClasses.map((rc) => (
            <option key={rc.id} value={rc.id}>{rc.label}</option>
          ))}
        </select>
      </div>

      {/* Tools Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {tools.length === 0
                ? "No tools registered yet. Register tools to classify their risk and control governance behavior."
                : "No tools match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Tool</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Risk Class</th>
                    <th className="text-left p-3 font-medium">Severity</th>
                    <th className="text-left p-3 font-medium">Sensitive</th>
                    <th className="text-left p-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tool) => (
                    <tr key={tool.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">
                        {tool.display_name || tool.tool_name}
                        {tool.display_name && (
                          <span className="text-muted-foreground ml-1">({tool.tool_name})</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">{tool.tool_action}</td>
                      <td className="p-3">
                        <Badge variant={riskBadgeVariant(tool.risk_severity)}>
                          {tool.risk_class.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                tool.risk_severity >= 90 ? "bg-red-500" :
                                tool.risk_severity >= 70 ? "bg-orange-500" :
                                tool.risk_severity >= 50 ? "bg-yellow-500" : "bg-green-500"
                              }`}
                              style={{ width: `${tool.risk_severity}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{tool.risk_severity}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {tool.is_sensitive && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs max-w-xs truncate">
                        {tool.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Class Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Class Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {riskClasses.map((rc) => (
              <div key={rc.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge variant={riskBadgeVariant(rc.severity)} className="mt-0.5 whitespace-nowrap">
                  {rc.severity}
                </Badge>
                <div>
                  <p className="font-medium text-sm">{rc.label}</p>
                  <p className="text-xs text-muted-foreground">{rc.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {riskCounts[rc.id] ?? 0} tool{(riskCounts[rc.id] ?? 0) !== 1 ? "s" : ""} registered
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
