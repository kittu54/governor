"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, FileText, Upload, RotateCcw, ChevronDown,
  ChevronRight, Hash, GitBranch, Eye, AlertTriangle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface PolicyItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  enforcement_mode: string;
  current_version_id: string | null;
  current_version_number: number | null;
  version_count: number;
  created_at: string;
}

interface VersionItem {
  id: string;
  version_number: number;
  checksum: string;
  change_summary: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

interface VersionDetail {
  id: string;
  version_number: number;
  definition: Record<string, unknown>;
  checksum: string;
  is_published: boolean;
}

interface Props {
  orgId: string;
  initialPolicies: PolicyItem[];
}

const ENFORCEMENT_MODES = ["DEV", "STAGING", "PROD"] as const;

function statusBadge(status: string) {
  switch (status) {
    case "PUBLISHED": return <Badge variant="success">{status}</Badge>;
    case "DRAFT": return <Badge variant="secondary">{status}</Badge>;
    case "ARCHIVED": return <Badge variant="outline">{status}</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function modeBadge(mode: string) {
  switch (mode) {
    case "PROD": return <Badge variant="destructive">{mode}</Badge>;
    case "STAGING": return <Badge variant="warning">{mode}</Badge>;
    case "DEV": return <Badge variant="secondary">{mode}</Badge>;
    default: return <Badge>{mode}</Badge>;
  }
}

const EXAMPLE_DEFINITION = JSON.stringify({
  rules: [
    {
      name: "block-high-value-refunds",
      description: "Deny refunds over $500",
      effect: "DENY",
      priority: 10,
      subjects: [{ type: "tool", value: "stripe.refund" }],
      conditions: [{ field: "cost_estimate_usd", operator: "greater_than", value: 500 }],
      reason: "High-value refunds require manual processing"
    },
    {
      name: "allow-read-only",
      description: "Allow all read operations",
      effect: "ALLOW",
      priority: 100,
      subjects: [{ type: "tool_action", value: "read" }, { type: "tool_action", value: "GET" }],
    }
  ]
}, null, 2);

export function PolicySetsClient({ orgId, initialPolicies }: Props) {
  const [policies, setPolicies] = useState<PolicyItem[]>(initialPolicies);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [versionDetail, setVersionDetail] = useState<VersionDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadVersions(policyId: string) {
    if (expandedId === policyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(policyId);
    setVersionDetail(null);
    try {
      const res = await fetch(`${API}/v1/policies/v2/${policyId}/versions?org_id=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
      } else {
        showToast("Failed to load versions", "error");
      }
    } catch {
      showToast("Network error loading versions", "error");
    }
  }

  async function viewVersionDetail(versionId: string) {
    try {
      const res = await fetch(`${API}/v1/policies/v2/versions/${versionId}`);
      if (res.ok) {
        setVersionDetail(await res.json());
      } else {
        showToast("Failed to load version detail", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  function createPolicy(formData: FormData) {
    startTransition(async () => {
      const payload = {
        org_id: orgId,
        name: formData.get("name"),
        description: formData.get("description") || undefined,
        enforcement_mode: formData.get("enforcement_mode"),
      };

      const res = await fetch(`${API}/v1/policies/v2`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setPolicies(prev => [{
          ...created,
          current_version_id: null,
          current_version_number: null,
          version_count: 0,
          created_at: new Date().toISOString(),
        }, ...prev]);
        setShowCreate(false);
        showToast("Policy created");
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.error ?? "Failed to create policy", "error");
      }
    });
  }

  function createVersion(policyId: string, formData: FormData) {
    startTransition(async () => {
      let definition;
      try {
        definition = JSON.parse(formData.get("definition") as string);
      } catch {
        showToast("Invalid JSON definition", "error");
        return;
      }

      const payload = {
        definition,
        change_summary: formData.get("change_summary") || undefined,
      };

      const res = await fetch(`${API}/v1/policies/v2/${policyId}/versions?org_id=${orgId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setVersions(prev => [{ ...created, is_published: false }, ...prev]);
        setPolicies(prev => prev.map(p =>
          p.id === policyId ? { ...p, version_count: p.version_count + 1 } : p
        ));
        setShowCreateVersion(null);
        if (created.warnings?.length) {
          showToast(`Version created with ${created.warnings.length} warning(s)`);
        } else {
          showToast("Version created");
        }
      } else {
        const err = await res.json().catch(() => null);
        const msg = err?.validation_errors?.length
          ? `Validation: ${err.validation_errors.join("; ")}`
          : err?.error ?? "Failed to create version";
        showToast(msg, "error");
      }
    });
  }

  async function publishVersion(versionId: string, policyId: string, versionNumber: number) {
    setLoadingAction(versionId);
    try {
      const res = await fetch(`${API}/v1/policies/v2/versions/${versionId}/publish?org_id=${orgId}`, {
        method: "POST",
      });

      if (res.ok) {
        setVersions(prev => prev.map(v => ({
          ...v,
          is_published: v.id === versionId,
        })));
        setPolicies(prev => prev.map(p =>
          p.id === policyId
            ? { ...p, status: "PUBLISHED", current_version_id: versionId, current_version_number: versionNumber }
            : p
        ));
        showToast(`Version ${versionNumber} published`);
      } else {
        showToast("Failed to publish", "error");
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function rollbackVersion(versionId: string, policyId: string, versionNumber: number) {
    setLoadingAction(versionId);
    try {
      const res = await fetch(`${API}/v1/policies/v2/versions/${versionId}/rollback-target?org_id=${orgId}`, {
        method: "POST",
      });

      if (res.ok) {
        setVersions(prev => prev.map(v => ({
          ...v,
          is_published: v.id === versionId,
        })));
        setPolicies(prev => prev.map(p =>
          p.id === policyId
            ? { ...p, current_version_id: versionId, current_version_number: versionNumber }
            : p
        ));
        showToast(`Rolled back to version ${versionNumber}`);
      } else {
        showToast("Failed to rollback", "error");
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Versioned Policies</h3>
          <p className="text-sm text-muted-foreground">Create, version, publish, and roll back policy sets with full audit trail.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "secondary" : "default"} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New Policy
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Policy</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-3" action={createPolicy}>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input name="name" placeholder="e.g. Finance Controls" required />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input name="description" placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label>Enforcement Mode</Label>
                <select name="enforcement_mode" defaultValue="DEV" className="h-10 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                  {ENFORCEMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={isPending} size="sm">
                  {isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating...</> : "Create Policy"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Policies List */}
      {policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No versioned policies yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {policies.map(policy => (
            <Card key={policy.id} className={expandedId === policy.id ? "ring-1 ring-primary/30" : ""}>
              <div
                className="flex cursor-pointer items-center gap-3 p-4 hover:bg-muted/30"
                onClick={() => loadVersions(policy.id)}
              >
                {expandedId === policy.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{policy.name}</span>
                    {statusBadge(policy.status)}
                    {modeBadge(policy.enforcement_mode)}
                  </div>
                  {policy.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{policy.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" /> {policy.version_count} version{policy.version_count !== 1 ? "s" : ""}
                  </span>
                  {policy.current_version_number && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> v{policy.current_version_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded: Versions */}
              {expandedId === policy.id && (
                <div className="border-t border-border bg-muted/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium">Version History</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setShowCreateVersion(showCreateVersion === policy.id ? null : policy.id); }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> New Version
                    </Button>
                  </div>

                  {/* Create Version Form */}
                  {showCreateVersion === policy.id && (
                    <Card className="mb-4 border-dashed">
                      <CardContent className="p-4">
                        <form action={(fd) => createVersion(policy.id, fd)} className="space-y-3">
                          <div className="space-y-1.5">
                            <Label>Change Summary</Label>
                            <Input name="change_summary" placeholder="What changed in this version?" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label>Policy Definition (JSON)</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  const textarea = (e.target as HTMLElement).closest("form")?.querySelector("textarea");
                                  if (textarea) (textarea as HTMLTextAreaElement).value = EXAMPLE_DEFINITION;
                                }}
                              >
                                Load Example
                              </Button>
                            </div>
                            <Textarea
                              name="definition"
                              rows={10}
                              className="font-mono text-xs"
                              placeholder={EXAMPLE_DEFINITION}
                              required
                            />
                          </div>
                          <Button type="submit" disabled={isPending} size="sm">
                            {isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Compiling...</> : "Create Version"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {versions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No versions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map(v => (
                        <div
                          key={v.id}
                          className={`rounded-lg border p-3 ${
                            v.is_published
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-border bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">v{v.version_number}</span>
                              {v.is_published && <Badge variant="success" className="text-[10px]">LIVE</Badge>}
                              <span className="font-mono text-xs text-muted-foreground">{v.checksum.slice(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => viewVersionDetail(v.id)}
                              >
                                <Eye className="mr-1 h-3 w-3" /> View
                              </Button>
                              {!v.is_published && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs"
                                  disabled={loadingAction === v.id}
                                  onClick={() => publishVersion(v.id, policy.id, v.version_number)}
                                >
                                  {loadingAction === v.id
                                    ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    : <Upload className="mr-1 h-3 w-3" />
                                  }
                                  Publish
                                </Button>
                              )}
                              {v.is_published && versions.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled
                                >
                                  Current
                                </Button>
                              )}
                              {!v.is_published && policy.current_version_number !== null && v.version_number < policy.current_version_number && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={loadingAction === v.id}
                                  onClick={() => rollbackVersion(v.id, policy.id, v.version_number)}
                                >
                                  {loadingAction === v.id
                                    ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    : <RotateCcw className="mr-1 h-3 w-3" />
                                  }
                                  Rollback
                                </Button>
                              )}
                            </div>
                          </div>
                          {v.change_summary && (
                            <p className="mt-1 text-xs text-muted-foreground">{v.change_summary}</p>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground/70">
                            {v.created_by && `by ${v.created_by} · `}
                            {new Date(v.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Version Detail Viewer */}
                  {versionDetail && (
                    <Card className="mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          Version {versionDetail.version_number} Definition
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{versionDetail.checksum}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed">
                          {JSON.stringify(versionDetail.definition, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
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
