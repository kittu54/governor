"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  UserRoundCog, CheckCircle, XCircle, Loader2, Search, Filter,
  AlertTriangle, Clock, ChevronDown, ChevronRight, ArrowUpRight, MessageSquare,
} from "lucide-react";

interface ApprovalAction {
  id: string;
  action: string;
  comment: string | null;
  created_at: string;
}

interface ApprovalItem {
  id: string;
  org_id: string;
  agent_id: string;
  agent_name?: string;
  agent_framework?: string;
  risk_class?: string | null;
  tool_name: string;
  tool_action: string;
  cost_estimate_usd: number;
  status: string;
  reason?: string | null;
  evidence?: unknown | null;
  requested_at: string;
  expires_at?: string | null;
  is_expired?: boolean;
  sla_remaining_seconds?: number | null;
  actions?: ApprovalAction[];
}

interface ApprovalsClientProps {
  initialApprovals: ApprovalItem[];
  orgId: string;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "DENIED", "EXPIRED"] as const;

function riskBadge(riskClass: string | null | undefined) {
  if (!riskClass) return null;
  const severity: Record<string, "destructive" | "warning" | "default"> = {
    MONEY_MOVEMENT: "destructive",
    CODE_EXECUTION: "destructive",
    ADMIN_ACTION: "destructive",
    EXTERNAL_COMMUNICATION: "warning",
    DATA_EXPORT: "warning",
    DATA_WRITE: "warning",
    PII_ACCESS: "warning",
    CREDENTIAL_USE: "destructive",
    FILE_MUTATION: "warning",
    LOW_RISK: "default",
  };
  return (
    <Badge variant={severity[riskClass] ?? "default"} className="text-[10px]">
      {riskClass.replace(/_/g, " ")}
    </Badge>
  );
}

function formatTimeRemaining(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function ApprovalsClient({ initialApprovals, orgId }: ApprovalsClientProps) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [loading, setLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);

  const counts = useMemo(() => ({
    pending: approvals.filter(a => a.status === "PENDING").length,
    approved: approvals.filter(a => a.status === "APPROVED").length,
    denied: approvals.filter(a => a.status === "DENIED").length,
    expired: approvals.filter(a => a.status === "EXPIRED" || a.is_expired).length,
  }), [approvals]);

  const totalCostPending = useMemo(
    () => approvals.filter(a => a.status === "PENDING").reduce((s, a) => s + a.cost_estimate_usd, 0),
    [approvals]
  );

  const filtered = useMemo(() => {
    return approvals.filter(a => {
      const effectiveStatus = a.is_expired && a.status === "PENDING" ? "EXPIRED" : a.status;
      if (statusFilter !== "ALL" && effectiveStatus !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.agent_id.toLowerCase().includes(q) ||
          (a.agent_name?.toLowerCase().includes(q) ?? false) ||
          a.tool_name.toLowerCase().includes(q) ||
          a.tool_action.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.risk_class?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [approvals, statusFilter, search]);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAction(approvalId: string, action: "approve" | "deny" | "escalate", comment?: string) {
    setLoading(approvalId);
    try {
      const res = await fetch(`${API}/v1/approvals/${approvalId}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decided_by: "console_user",
          comment: comment || undefined,
        }),
      });

      if (!res.ok) {
        showToast(`Failed to ${action}`, "error");
        return;
      }

      const statusMap: Record<string, string> = { approve: "APPROVED", deny: "DENIED", escalate: "ESCALATED" };
      if (action !== "escalate") {
        setApprovals(prev =>
          prev.map(a => a.id === approvalId ? { ...a, status: statusMap[action] } : a)
        );
      }
      showToast(`Request ${action === "approve" ? "approved" : action === "deny" ? "denied" : "escalated"}`);
    } catch {
      showToast("Network error", "error");
    } finally {
      setLoading(null);
    }
  }

  async function addComment(approvalId: string) {
    if (!commentText.trim()) return;
    setLoading(approvalId);
    try {
      const res = await fetch(`${API}/v1/approvals/${approvalId}/comment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comment: commentText, decided_by: "console_user" }),
      });
      if (res.ok) {
        showToast("Comment added");
        setCommentText("");
      }
    } catch {
      showToast("Failed to add comment", "error");
    } finally {
      setLoading(null);
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

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {([
          { key: "PENDING", label: "Pending", count: counts.pending, color: "text-amber-400", ring: "ring-amber-500/50" },
          { key: "APPROVED", label: "Approved", count: counts.approved, color: "text-emerald-400", ring: "ring-emerald-500/50" },
          { key: "DENIED", label: "Denied", count: counts.denied, color: "text-red-400", ring: "ring-red-500/50" },
          { key: "EXPIRED", label: "Expired", count: counts.expired, color: "text-muted-foreground", ring: "ring-border" },
        ] as const).map(s => (
          <Card
            key={s.key}
            className={`cursor-pointer transition-all ${statusFilter === s.key ? `ring-1 ${s.ring}` : ""}`}
            onClick={() => setStatusFilter(statusFilter === s.key ? "ALL" : s.key)}
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Cost</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${totalCostPending.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approvals Inbox</CardTitle>
              <CardDescription>Review and decide on tool call approval requests from agents</CardDescription>
            </div>
            {counts.pending > 0 && <Badge variant="warning">{counts.pending} pending</Badge>}
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search agent, tool, risk class, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Requested</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <UserRoundCog className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {approvals.length === 0
                        ? "No approval requests yet. Approvals appear when tool calls exceed configured thresholds."
                        : "No approvals match your current filters."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(approval => {
                  const isExpanded = expandedId === approval.id;
                  const isPending = approval.status === "PENDING" && !approval.is_expired;
                  return (
                    <>
                      <TableRow key={approval.id} className={isExpanded ? "border-b-0" : ""}>
                        <TableCell>
                          <button onClick={() => setExpandedId(isExpanded ? null : approval.id)} className="text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(approval.requested_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Link href={`/agents/${approval.agent_id}?org_id=${encodeURIComponent(orgId)}` as Route} className="text-primary hover:underline">
                            <span className="text-sm font-medium">{approval.agent_name ?? approval.agent_id}</span>
                          </Link>
                          {approval.agent_framework && (
                            <Badge variant="outline" className="ml-1.5 text-[9px]">{approval.agent_framework}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{approval.tool_name}.{approval.tool_action}</TableCell>
                        <TableCell>{riskBadge(approval.risk_class)}</TableCell>
                        <TableCell className="font-mono">${approval.cost_estimate_usd.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            approval.is_expired ? "secondary" :
                            approval.status === "PENDING" ? "warning" :
                            approval.status === "APPROVED" ? "success" : "destructive"
                          }>
                            {approval.is_expired ? "EXPIRED" : approval.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isPending && approval.sla_remaining_seconds != null ? (
                            <span className={`flex items-center gap-1 text-xs ${
                              approval.sla_remaining_seconds < 300 ? "text-red-400" : "text-muted-foreground"
                            }`}>
                              <Clock className="h-3 w-3" />
                              {formatTimeRemaining(approval.sla_remaining_seconds)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-7 text-xs" onClick={() => handleAction(approval.id, "approve")} disabled={loading === approval.id}>
                                {loading === approval.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleAction(approval.id, "deny")} disabled={loading === approval.id}>
                                <XCircle className="mr-1 h-3 w-3" /> Deny
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAction(approval.id, "escalate")} disabled={loading === approval.id}>
                                <ArrowUpRight className="mr-1 h-3 w-3" /> Escalate
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Decided</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <TableRow key={`${approval.id}-detail`}>
                          <TableCell colSpan={9} className="border-t-0 bg-muted/20 px-8 py-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</h4>
                                <div className="space-y-1.5 text-sm">
                                  <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{approval.id}</span></div>
                                  {approval.reason && <div><span className="text-muted-foreground">Reason:</span> {approval.reason}</div>}
                                  {approval.expires_at && (
                                    <div>
                                      <span className="text-muted-foreground">Expires:</span>{" "}
                                      {new Date(approval.expires_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                {approval.evidence != null && (
                                  <div className="mt-3">
                                    <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Evidence</h4>
                                    <pre className="max-h-[200px] overflow-auto rounded bg-muted/50 p-2 font-mono text-xs">
                                      {JSON.stringify(approval.evidence, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              <div>
                                {approval.actions && approval.actions.length > 0 && (
                                  <div className="mb-3">
                                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Action History</h4>
                                    <div className="space-y-1.5">
                                      {approval.actions.map(a => (
                                        <div key={a.id} className="rounded border border-border bg-muted/30 p-2 text-xs">
                                          <Badge variant={a.action === "APPROVE" ? "success" : a.action === "DENY" ? "destructive" : "secondary"} className="mr-1.5 text-[9px]">
                                            {a.action}
                                          </Badge>
                                          {a.comment && <span className="text-muted-foreground">{a.comment}</span>}
                                          <span className="ml-1.5 text-muted-foreground/70">{new Date(a.created_at).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {isPending && (
                                  <div>
                                    <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Add Comment</h4>
                                    <div className="flex gap-2">
                                      <Textarea
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        placeholder="Add a note or question..."
                                        rows={2}
                                        className="text-xs"
                                      />
                                      <Button size="sm" variant="outline" className="h-auto" onClick={() => addComment(approval.id)} disabled={loading === approval.id}>
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
